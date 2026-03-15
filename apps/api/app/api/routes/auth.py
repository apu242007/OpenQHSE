"""Authentication endpoints: login, register, refresh, logout, password reset, profile."""

import uuid as uuid_lib

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import JTI_BLACKLIST_PREFIX, CurrentUser, DBSession
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.redis import redis_client
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    verify_token_type,
)
from app.models.user import Organization, User, UserRole, UserStatus
from app.schemas.common import MessageResponse
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    ProfileUpdateRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

# Redis key prefixes
TOKEN_BLACKLIST_PREFIX = "token:blacklist:"
RESET_TOKEN_PREFIX = "token:reset:"
# Import RESET_TOKEN_TTL from schemas to keep a single source of truth
from app.schemas.user import RESET_TOKEN_TTL  # noqa: E402


def _generate_slug(name: str) -> str:
    """Generate a URL-safe slug from an organization name."""
    import re

    slug = re.sub(r"[^\w\s-]", "", name.lower())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")
    return f"{slug}-{uuid_lib.uuid4().hex[:6]}"


# ── Register ──────────────────────────────────────────────────


@router.post(
    "/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user and organization",
)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: DBSession) -> LoginResponse:
    """Register a new user with a new organization.

    Creates both the organization and the first admin user.
    Returns JWT token pair + user object on success.
    """
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    org = Organization(
        name=body.organization_name,
        slug=_generate_slug(body.organization_name),
    )
    db.add(org)
    await db.flush()

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role=UserRole.ORG_ADMIN,
        status=UserStatus.ACTIVE,
        language=body.language,
        is_email_verified=False,
        organization_id=org.id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    jti = str(uuid_lib.uuid4())
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"org_id": str(org.id), "role": user.role, "jti": jti},
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.api_access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


# ── Login ─────────────────────────────────────────────────────


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Authenticate and receive JWT tokens",
)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: DBSession) -> LoginResponse:
    """Authenticate a user with email and password.

    Returns JWT access + refresh tokens AND the user object so NextAuth
    can populate the session without an extra /me roundtrip.
    """
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}. Contact your administrator.",
        )

    jti = str(uuid_lib.uuid4())
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"org_id": str(user.organization_id), "role": user.role, "jti": jti},
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.api_access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


# ── Refresh ───────────────────────────────────────────────────


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh an access token",
)
async def refresh_token(body: RefreshRequest, db: DBSession) -> TokenResponse:
    """Exchange a valid refresh token for a new access token pair."""
    try:
        payload = decode_token(body.refresh_token)
        if not verify_token_type(payload, "refresh"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from err

    # Check if token is blacklisted
    is_blacklisted = await redis_client.get(f"{TOKEN_BLACKLIST_PREFIX}{body.refresh_token[:64]}")
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    from uuid import UUID

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Blacklist old refresh token (token rotation)
    await redis_client.setex(
        f"{TOKEN_BLACKLIST_PREFIX}{body.refresh_token[:64]}",
        settings.api_refresh_token_expire_days * 86400,
        "revoked",
    )

    jti = str(uuid_lib.uuid4())
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"org_id": str(user.organization_id), "role": user.role, "jti": jti},
    )
    new_refresh = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        expires_in=settings.api_access_token_expire_minutes * 60,
    )


# ── Logout ────────────────────────────────────────────────────


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout and invalidate tokens",
)
async def logout(
    request: Request,
    body: LogoutRequest,
    current_user: CurrentUser,
) -> MessageResponse:
    """Invalidate both the refresh token and the current access token's jti.

    Two-pronged invalidation:
    1. Refresh token prefix → Redis blacklist (prevents token rotation)
    2. Access token jti    → Redis blacklist (prevents continued use of the
       current access token until it naturally expires)
    """
    # Blacklist the refresh token
    await redis_client.setex(
        f"{TOKEN_BLACKLIST_PREFIX}{body.refresh_token[:64]}",
        settings.api_refresh_token_expire_days * 86400,
        "revoked",
    )

    # Blacklist the access token's jti so it's immediately invalid
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        raw_token = auth_header[7:]
        try:
            from app.core.security import decode_token as _decode

            payload = _decode(raw_token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                import time

                ttl = max(1, int(exp - time.time()))
                await redis_client.setex(
                    f"{JTI_BLACKLIST_PREFIX}{jti}",
                    ttl,
                    "revoked",
                )
        except Exception:
            pass  # Malformed token — no-op, refresh token is already revoked

    return MessageResponse(message="Logged out successfully")


# ── Forgot Password ──────────────────────────────────────────


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset email",
)
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: DBSession) -> MessageResponse:
    """Generate a password reset token and send it via email.

    Always returns success to prevent email enumeration.
    """
    import secrets

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user and user.status == UserStatus.ACTIVE:
        reset_token = secrets.token_urlsafe(48)

        await redis_client.setex(
            f"{RESET_TOKEN_PREFIX}{reset_token}",
            RESET_TOKEN_TTL,
            str(user.id),
        )

        try:
            from app.services.email_service import send_password_reset_email

            reset_url = f"{settings.api_cors_origins.split(',')[0]}/reset-password?token={reset_token}"
            await send_password_reset_email(
                to_email=user.email,
                user_name=user.first_name,
                reset_url=reset_url,
            )
        except Exception:
            pass  # Token stored; email failure is non-fatal

    return MessageResponse(
        message="If the email exists, a password reset link has been sent",
    )


# ── Reset Password ───────────────────────────────────────────


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using a token",
)
@limiter.limit("5/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, db: DBSession) -> MessageResponse:
    """Verify the reset token and set a new password."""
    user_id_str = await redis_client.get(f"{RESET_TOKEN_PREFIX}{body.token}")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    from uuid import UUID

    result = await db.execute(select(User).where(User.id == UUID(user_id_str)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.hashed_password = hash_password(body.new_password)
    user.updated_by = "auth:reset-password"

    # Invalidate the used token immediately
    await redis_client.delete(f"{RESET_TOKEN_PREFIX}{body.token}")

    return MessageResponse(message="Password has been reset successfully")


# ── Get Profile ───────────────────────────────────────────────


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Return the profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


# ── Update Profile ────────────────────────────────────────────


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_me(
    body: ProfileUpdateRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> UserResponse:
    """Update the authenticated user's own profile fields."""
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    current_user.updated_by = str(current_user.id)

    await db.flush()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)


# ── Change Password ──────────────────────────────────────────


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password while authenticated",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> MessageResponse:
    """Verify the current password and set a new one."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.hashed_password = hash_password(body.new_password)
    current_user.updated_by = str(current_user.id)
    await db.flush()

    return MessageResponse(message="Password changed successfully")
