"""Security utilities: password hashing, JWT (joserfc), RBAC.

NOTA: python-jose fue reemplazado por joserfc debido a CVEs activos.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import OctKey

from app.core.config import get_settings

if TYPE_CHECKING:
    from app.models.user import User

settings = get_settings()

security_scheme = HTTPBearer(auto_error=False)

# ── Role hierarchy (higher index = more privilege) ────────────
ROLE_HIERARCHY: dict[str, int] = {
    "viewer": 0,
    "worker": 1,
    "inspector": 2,
    "supervisor": 3,
    "manager": 4,
    "org_admin": 5,
    "super_admin": 6,
}

# ── Module permissions matrix ─────────────────────────────────
MODULE_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "inspections": {
        "create": ["inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "read": ["viewer", "worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["manager", "org_admin", "super_admin"],
        "approve": ["supervisor", "manager", "org_admin", "super_admin"],
    },
    "incidents": {
        "create": ["worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "read": ["viewer", "worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["org_admin", "super_admin"],
        "approve": ["manager", "org_admin", "super_admin"],
    },
    "permits": {
        "create": ["supervisor", "manager", "org_admin", "super_admin"],
        "read": ["worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["org_admin", "super_admin"],
        "approve": ["manager", "org_admin", "super_admin"],
    },
    "users": {
        "create": ["org_admin", "super_admin"],
        "read": ["manager", "org_admin", "super_admin"],
        "update": ["org_admin", "super_admin"],
        "delete": ["super_admin"],
        "approve": ["super_admin"],
    },
    "documents": {
        "create": ["inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "read": ["viewer", "worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["manager", "org_admin", "super_admin"],
        "approve": ["manager", "org_admin", "super_admin"],
    },
    "training": {
        "create": ["manager", "org_admin", "super_admin"],
        "read": ["worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["manager", "org_admin", "super_admin"],
        "delete": ["org_admin", "super_admin"],
        "approve": ["org_admin", "super_admin"],
    },
    "risks": {
        "create": ["inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "read": ["viewer", "worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["manager", "org_admin", "super_admin"],
        "approve": ["manager", "org_admin", "super_admin"],
    },
    "equipment": {
        "create": ["supervisor", "manager", "org_admin", "super_admin"],
        "read": ["worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["org_admin", "super_admin"],
        "approve": ["manager", "org_admin", "super_admin"],
    },
    "observations": {
        "create": ["worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "read": ["viewer", "worker", "inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["supervisor", "manager", "org_admin", "super_admin"],
        "delete": ["manager", "org_admin", "super_admin"],
        "approve": ["supervisor", "manager", "org_admin", "super_admin"],
    },
    "contractors": {
        "create": ["manager", "org_admin", "super_admin"],
        "read": ["supervisor", "manager", "org_admin", "super_admin"],
        "update": ["manager", "org_admin", "super_admin"],
        "delete": ["org_admin", "super_admin"],
        "approve": ["org_admin", "super_admin"],
    },
    "kpis": {
        "create": ["manager", "org_admin", "super_admin"],
        "read": ["inspector", "supervisor", "manager", "org_admin", "super_admin"],
        "update": ["manager", "org_admin", "super_admin"],
        "delete": ["org_admin", "super_admin"],
        "approve": ["org_admin", "super_admin"],
    },
    "analytics": {
        "create": ["manager", "org_admin", "super_admin"],
        "read": ["supervisor", "manager", "org_admin", "super_admin"],
        "update": ["org_admin", "super_admin"],
        "delete": ["super_admin"],
        "approve": ["super_admin"],
    },
}


def _get_jwt_key() -> OctKey:
    """Return the OctKey derived from settings secret."""
    return OctKey.import_key(settings.api_secret_key.encode())


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return _bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def create_access_token(
    subject: str | int,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token using joserfc."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.api_access_token_expire_minutes))
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode({"alg": settings.api_algorithm}, payload, _get_jwt_key())


def create_refresh_token(subject: str | int) -> str:
    """Create a signed JWT refresh token using joserfc."""
    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.api_refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
    }
    return jwt.encode({"alg": settings.api_algorithm}, payload, _get_jwt_key())


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token using joserfc. Raises JoseError on failure."""
    key = _get_jwt_key()
    token_obj = jwt.decode(token, key)
    claims = token_obj.claims

    # Validate expiry manually (joserfc exposes claims as plain dict)
    exp = claims.get("exp")
    if exp is None or datetime.now(UTC).timestamp() > exp:
        raise JoseError("Token has expired")

    return dict(claims)


def verify_token_type(payload: dict[str, Any], expected_type: str) -> bool:
    """Verify a decoded token is of the expected type."""
    return payload.get("type") == expected_type


# ── Role-based access helpers ─────────────────────────────────


def check_role_level(user_role: str, min_role: str) -> bool:
    """Return True if user_role meets or exceeds min_role in hierarchy."""
    return ROLE_HIERARCHY.get(user_role, -1) >= ROLE_HIERARCHY.get(min_role, 999)


def check_module_permission(user_role: str, module: str, action: str) -> bool:
    """Return True if user_role is allowed to perform action on module."""
    perms = MODULE_PERMISSIONS.get(module, {})
    allowed_roles = perms.get(action, [])
    return user_role in allowed_roles


def require_permission(module: str, action: str) -> Any:  # noqa: ANN201
    """FastAPI dependency factory: check granular module+action permission.

    IMPORTANTE: Siempre consulta DB via get_current_user (no solo el JWT).
    get_current_user ya valida que el usuario esté ACTIVE en DB y setea
    los ContextVars para RLS.

    Usage::

        @router.post("/inspections", dependencies=[Depends(require_permission("inspections", "create"))])
        async def create_inspection(user: CurrentUser): ...
    """

    from app.api.deps import get_current_user

    async def _permission_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        if not check_module_permission(user_role, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {module}.{action}",
            )
        return current_user

    return Depends(_permission_checker)
