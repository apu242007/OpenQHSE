"""FastAPI dependencies: auth, pagination, org context."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.context import current_org_id, current_user_id
from app.core.database import _IS_SQLITE, get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.common import PaginationParams

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)

# Redis key prefix for jti (JWT ID) blacklist.
JTI_BLACKLIST_PREFIX = "token:jti:blacklist:"

# ── Demo user UUID — seeded by seed_local.py ──────────────────
DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Extrae y valida el usuario actual.

    When DISABLE_AUTH=true (local demo mode), skips JWT validation
    and returns the first active org_admin user from the database.
    """
    # ── Demo mode (no auth) ───────────────────────────────────
    if settings.disable_auth:
        result = await db.execute(
            select(User).where(
                User.is_deleted.is_(False),
                User.status == UserStatus.ACTIVE,
            ).limit(1)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Demo user not found. Run: python seed_local.py",
            )
        current_user_id.set(str(user.id))
        current_org_id.set(str(user.organization_id))
        if not _IS_SQLITE:
            await db.execute(
                text(f"SET LOCAL app.current_org_id = '{user.organization_id!s}'")
            )
        return user

    # ── Full auth ─────────────────────────────────────────────
    from joserfc.errors import JoseError

    from app.core.security import decode_token, verify_token_type

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_token(credentials.credentials)
        if not verify_token_type(payload, "access"):
            raise credentials_exception
        user_id_str: str | None = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = UUID(user_id_str)
    except (JoseError, ValueError) as err:
        raise credentials_exception from err

    # ── jti blacklist check ───────────────────────────────────
    jti: str | None = payload.get("jti")
    if jti:
        try:
            from app.core.redis import redis_client

            is_blacklisted = await redis_client.get(f"{JTI_BLACKLIST_PREFIX}{jti}")
            if is_blacklisted:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except HTTPException:
            raise
        except Exception:
            pass  # Redis unavailable — fail open

    # ── DB verification ───────────────────────────────────────
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    current_user_id.set(str(user.id))
    current_org_id.set(str(user.organization_id))

    if not _IS_SQLITE:
        org_id_str = str(user.organization_id)
        await db.execute(text(f"SET LOCAL app.current_org_id = '{org_id_str}'"))

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DBSession = Annotated[AsyncSession, Depends(get_db)]


def require_roles(*roles: UserRole) -> Any:  # noqa: ANN201
    """Dependency factory que restringe el acceso a roles específicos."""

    async def _check_role(current_user: CurrentUser) -> User:
        if settings.disable_auth:
            return current_user  # skip role check in demo mode
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' does not have permission for this action",
            )
        return current_user

    return Depends(_check_role)


AdminUser = Annotated[User, require_roles(UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN)]
ManagerUser = Annotated[
    User,
    require_roles(
        UserRole.SUPER_ADMIN,
        UserRole.ORG_ADMIN,
        UserRole.MANAGER,
        UserRole.SUPERVISOR,
    ),
]


def require_site_access(site_id_param: str = "site_id") -> Any:  # noqa: ANN201
    """Dependency factory: verifica que el usuario pertenece al sitio solicitado."""

    async def _check(
        current_user: CurrentUser,
        db: DBSession,
    ) -> User:
        if settings.disable_auth:
            return current_user
        unrestricted = {UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER}
        if current_user.role in unrestricted:
            return current_user
        assigned = getattr(current_user, "site_ids", None) or []
        if not assigned:
            return current_user
        return current_user

    return Depends(_check)


def pagination_params(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página"),
) -> PaginationParams:
    """Dependency para parámetros de paginación."""
    return PaginationParams(page=page, page_size=page_size)


Pagination = Annotated[PaginationParams, Depends(pagination_params)]
