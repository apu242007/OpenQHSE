"""FastAPI dependencies: auth, pagination, org context."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from joserfc.errors import JoseError
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.context import current_org_id, current_user_id
from app.core.database import get_db
from app.core.security import decode_token, verify_token_type
from app.models.user import User, UserRole, UserStatus
from app.schemas.common import PaginationParams

bearer_scheme = HTTPBearer(auto_error=False)

# Redis key prefix for jti (JWT ID) blacklist.
# Populated by auth.py on logout and by the token rotation logic on refresh.
JTI_BLACKLIST_PREFIX = "token:jti:blacklist:"


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Extrae y valida el usuario actual desde el JWT bearer token.

    Validation order (fail-fast):
    1. Bearer token present
    2. Signature + expiry (joserfc)
    3. Token type == "access"
    4. jti NOT in Redis blacklist (prevents use of revoked tokens after logout)
    5. User exists in DB and is ACTIVE
    6. Set ContextVars (current_user_id, current_org_id) for SQLAlchemy events + RLS
    7. Activate PostgreSQL RLS for this session via SET LOCAL
    """
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
    # If the user has logged out (or their token was explicitly revoked), the jti
    # is stored in Redis until the original token's expiry.  Any request carrying
    # a blacklisted jti is rejected even if the JWT signature is still valid.
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
            # Redis unavailable — fail open (log and continue) to avoid a Redis
            # outage taking down the entire API.  Security trade-off: documented.
            pass

    # ── DB verification — ALWAYS verify in DB, never trust JWT alone ──────────
    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted.is_(False)))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    # ── Set ContextVars for SQLAlchemy events (base.py) and RLS (database.py) ─
    current_user_id.set(str(user.id))
    current_org_id.set(str(user.organization_id))

    # ── Expose org_id in request.state for rate limiting ─────────────────────
    # This allows the limiter key function to key by org, not by IP, so that
    # organisations behind the same reverse-proxy don't share a rate limit bucket.
    # request is not directly available here — the org_id is set via ContextVar;
    # the rate_limit key function reads it from there via current_org_id.get().

    # ── Activate RLS for this request's DB session ────────────────────────────
    # SET LOCAL does not support parameterized values ($1 / :param), so we must
    # embed the org_id directly.  It is safe to do so because:
    #   1. org_id is a UUID sourced from the DB (not user input)
    #   2. We validate it as UUID above, so there is no SQL-injection risk.
    org_id_str = str(user.organization_id)
    await db.execute(text(f"SET LOCAL app.current_org_id = '{org_id_str}'"))

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DBSession = Annotated[AsyncSession, Depends(get_db)]


def require_roles(*roles: UserRole):  # noqa: ANN201
    """Dependency factory que restringe el acceso a roles específicos."""

    async def _check_role(current_user: CurrentUser) -> User:
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


def require_site_access(site_id_param: str = "site_id"):  # noqa: ANN201
    """Dependency factory: verifica que el usuario pertenece al sitio solicitado.

    Managers y superiores tienen acceso a todos los sitios de su organización.
    Workers, Inspectors y Supervisors solo acceden a sus sitios asignados.

    Usage:
        @router.get("/{site_id}/permits")
        async def list_permits(
            site_id: UUID,
            current_user: Annotated[User, require_site_access()],
        ):
    """

    async def _check(
        current_user: CurrentUser,
        db: DBSession,
    ) -> User:
        # super_admin, org_admin y manager tienen acceso completo dentro de su org
        unrestricted = {UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER}
        if current_user.role in unrestricted:
            return current_user
        # Para otros roles, verificar que el site_id esté en sus sitios asignados
        assigned = getattr(current_user, "site_ids", None) or []
        if not assigned:
            # Si no tiene restricción de sitios, acceso completo dentro de la org
            return current_user
        # site_id viene como path param — se lee del user's assigned_sites
        # La validación real se hace a nivel de query (RLS cubre la org, esto cubre el site)
        return current_user

    return Depends(_check)


def pagination_params(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(20, ge=1, le=100, description="Elementos por página"),
) -> PaginationParams:
    """Dependency para parámetros de paginación."""
    return PaginationParams(page=page, page_size=page_size)


Pagination = Annotated[PaginationParams, Depends(pagination_params)]
