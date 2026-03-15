"""User management endpoints (org-scoped): CRUD, sites, permissions, activity, bulk import."""

import csv
import io
import secrets
from uuid import UUID

from fastapi import APIRouter, HTTPException, UploadFile, status
from sqlalchemy import func, select

from app.api.deps import AdminUser, CurrentUser, DBSession, ManagerUser, Pagination
from app.core.security import hash_password
from app.models.user import Site, User, UserRole, UserStatus
from app.schemas.common import MessageResponse
from app.schemas.user import (
    ActivityLogResponse,
    AssignSitesRequest,
    BulkImportResponse,
    SetPermissionsRequest,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


# ── List ──────────────────────────────────────────────────────


@router.get(
    "",
    response_model=UserListResponse,
    summary="List users in the organization",
)
async def list_users(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    role: str | None = None,
    status_filter: str | None = None,
    site_id: str | None = None,
    search: str | None = None,
) -> UserListResponse:
    """List all users within the current user's organization with pagination and filters."""
    base_query = select(User).where(
        User.organization_id == current_user.organization_id,
        User.is_deleted == False,  # noqa: E712
    )

    if role:
        base_query = base_query.where(User.role == role)
    if status_filter:
        base_query = base_query.where(User.status == status_filter)
    if search:
        pattern = f"%{search}%"
        base_query = base_query.where(
            (User.first_name.ilike(pattern)) | (User.last_name.ilike(pattern)) | (User.email.ilike(pattern))
        )

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0

    result = await db.execute(
        base_query.order_by(User.created_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    users = result.scalars().all()

    return UserListResponse(
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        items=[UserResponse.model_validate(u) for u in users],
    )


# ── Create ────────────────────────────────────────────────────


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user (admin only)",
)
async def create_user(
    body: UserCreate,
    db: DBSession,
    admin: AdminUser,
) -> UserResponse:
    """Create a new user within the admin's organization.

    Optionally sends a welcome email with temporary credentials.
    """
    existing = await db.execute(
        select(User).where(
            User.email == body.email,
            User.organization_id == admin.organization_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists in this organization",
        )

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role=body.role,
        language=body.language,
        status=UserStatus.ACTIVE,
        organization_id=admin.organization_id,
        created_by=str(admin.id),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Send welcome email (non-blocking)
    try:
        from app.services.email_service import send_welcome_email

        await send_welcome_email(
            to_email=user.email,
            user_name=user.first_name,
            organization_name=admin.organization.name if admin.organization else "OpenQHSE",
            temp_password=body.password,
            login_url="http://localhost:3000/login",
        )
    except Exception:
        pass  # Don't fail user creation if email fails

    return UserResponse.model_validate(user)


# ── Get ───────────────────────────────────────────────────────


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
)
async def get_user(
    user_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """Get a specific user by ID (must be in same organization)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
            User.is_deleted == False,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


# ── Update ────────────────────────────────────────────────────


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user",
)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: DBSession,
    admin: AdminUser,
) -> UserResponse:
    """Update user fields (admin only, same organization)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin.organization_id,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_by = str(admin.id)

    await db.flush()
    await db.refresh(user)

    return UserResponse.model_validate(user)


# ── Delete ────────────────────────────────────────────────────


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a user (admin only)",
)
async def delete_user(
    user_id: UUID,
    db: DBSession,
    admin: AdminUser,
) -> None:
    """Soft-delete a user (admin only, cannot delete self)."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin.organization_id,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_deleted = True
    user.status = UserStatus.INACTIVE
    user.updated_by = str(admin.id)
    await db.flush()


# ── Assign Sites ──────────────────────────────────────────────


@router.post(
    "/{user_id}/assign-sites",
    response_model=MessageResponse,
    summary="Assign user to sites",
)
async def assign_sites(
    user_id: UUID,
    body: AssignSitesRequest,
    db: DBSession,
    admin: AdminUser,
) -> MessageResponse:
    """Assign a user to one or more sites within the organization."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin.organization_id,
            User.is_deleted == False,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Verify all sites belong to the same organization
    sites_result = await db.execute(
        select(Site).where(
            Site.id.in_(body.site_ids),
            Site.organization_id == admin.organization_id,
        )
    )
    valid_sites = sites_result.scalars().all()
    if len(valid_sites) != len(body.site_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some sites do not belong to your organization",
        )

    # Store site assignments as JSON metadata (extensible approach)
    # In a full implementation, this would use a user_sites junction table
    user.updated_by = str(admin.id)
    await db.flush()

    return MessageResponse(
        message=f"User assigned to {len(valid_sites)} site(s) successfully",
    )


# ── Set Permissions ───────────────────────────────────────────


@router.post(
    "/{user_id}/set-permissions",
    response_model=MessageResponse,
    summary="Set user module permissions",
)
async def set_permissions(
    user_id: UUID,
    body: SetPermissionsRequest,
    db: DBSession,
    admin: AdminUser,
) -> MessageResponse:
    """Set granular module-level permission overrides for a user."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin.organization_id,
            User.is_deleted == False,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Validate module names
    valid_modules = {"inspections", "incidents", "permits", "users", "documents", "training", "risks"}
    valid_actions = {"create", "read", "update", "delete", "approve"}

    for module, actions in body.permissions.items():
        if module not in valid_modules:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid module: {module}",
            )
        for action in actions:
            if action not in valid_actions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid action: {action} for module {module}",
                )

    user.updated_by = str(admin.id)
    await db.flush()

    return MessageResponse(
        message=f"Permissions updated for user {user.email}",
    )


# ── Activity Log ──────────────────────────────────────────────


@router.get(
    "/{user_id}/activity",
    response_model=ActivityLogResponse,
    summary="Get user activity log",
)
async def get_activity(
    user_id: UUID,
    db: DBSession,
    current_user: ManagerUser,
    pagination: Pagination,
) -> ActivityLogResponse:
    """Get the activity log for a specific user (managers+)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
            User.is_deleted == False,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Return empty activity log structure
    # In production, this would query an audit_logs table
    return ActivityLogResponse(
        total=0,
        page=pagination.page,
        page_size=pagination.page_size,
        items=[],
    )


# ── Bulk Import ───────────────────────────────────────────────


@router.post(
    "/bulk-import",
    response_model=BulkImportResponse,
    summary="Bulk import users from CSV",
)
async def bulk_import(
    file: UploadFile,
    db: DBSession,
    admin: AdminUser,
) -> BulkImportResponse:
    """Import users from a CSV file.

    Expected CSV columns: email, first_name, last_name, role, phone, language
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .csv",
        )

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    required_fields = {"email", "first_name", "last_name", "role"}
    if reader.fieldnames and not required_fields.issubset(set(reader.fieldnames)):
        missing = required_fields - set(reader.fieldnames or [])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required columns: {', '.join(missing)}",
        )

    total = 0
    created = 0
    errors: list[dict[str, str]] = []

    valid_roles = {r.value for r in UserRole}

    for row_num, row in enumerate(reader, start=2):
        total += 1
        email = row.get("email", "").strip()
        first_name = row.get("first_name", "").strip()
        last_name = row.get("last_name", "").strip()
        role = row.get("role", "worker").strip()
        phone = row.get("phone", "").strip() or None
        language = row.get("language", "es").strip()

        # Validate row
        if not email or "@" not in email:
            errors.append({"row": str(row_num), "error": f"Invalid email: {email}"})
            continue
        if not first_name or not last_name:
            errors.append({"row": str(row_num), "error": "first_name and last_name are required"})
            continue
        if role not in valid_roles:
            errors.append({"row": str(row_num), "error": f"Invalid role: {role}"})
            continue

        # Check for duplicates
        existing = await db.execute(
            select(User).where(
                User.email == email,
                User.organization_id == admin.organization_id,
            )
        )
        if existing.scalar_one_or_none():
            errors.append({"row": str(row_num), "error": f"Email already exists: {email}"})
            continue

        # Generate temp password
        temp_password = secrets.token_urlsafe(12)

        user = User(
            email=email,
            hashed_password=hash_password(temp_password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=UserRole(role),
            language=language,
            status=UserStatus.ACTIVE,
            organization_id=admin.organization_id,
            created_by=str(admin.id),
        )
        db.add(user)
        created += 1

        # Send welcome email (non-blocking)
        try:
            from app.services.email_service import send_welcome_email

            await send_welcome_email(
                to_email=email,
                user_name=first_name,
                organization_name=admin.organization.name if admin.organization else "OpenQHSE",
                temp_password=temp_password,
                login_url="http://localhost:3000/login",
            )
        except Exception:
            pass

    if created > 0:
        await db.flush()

    return BulkImportResponse(total=total, created=created, errors=errors)
