"""User & authentication schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.models.user import UserRole, UserStatus
from app.schemas.common import BaseSchema, IDSchema, TimestampSchema


# ── Auth ─────────────────────────────────────────────────────

class LoginRequest(BaseSchema):
    """Credentials for login."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


RESET_TOKEN_TTL = 900  # 15 minutes — short window to limit brute-force


class TokenResponse(BaseSchema):
    """JWT token pair (used internally for refresh flows)."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginResponse(BaseSchema):
    """Full login response — includes token pair AND user object.

    NextAuth v5 uses this to populate the session without a separate
    /users/me call, reducing round-trips on page load.
    """

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class RefreshRequest(BaseSchema):
    """Request to refresh an access token."""

    refresh_token: str


class RegisterRequest(BaseSchema):
    """New user registration."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    organization_name: str = Field(min_length=2, max_length=255)
    language: str = Field(default="es", pattern=r"^(es|en|pt)$")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class ForgotPasswordRequest(BaseSchema):
    """Request a password reset token by email."""

    email: EmailStr


class ResetPasswordRequest(BaseSchema):
    """Reset password using a reset token."""

    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class ChangePasswordRequest(BaseSchema):
    """Change password while authenticated."""

    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class ProfileUpdateRequest(BaseSchema):
    """Update the current user's own profile."""

    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    phone: str | None = Field(None, max_length=20)
    language: str | None = Field(None, pattern=r"^(es|en|pt)$")
    avatar_url: str | None = None


class LogoutRequest(BaseSchema):
    """Logout / invalidate refresh token."""

    refresh_token: str


# ── User ─────────────────────────────────────────────────────

class UserBase(BaseSchema):
    """Shared user fields."""

    email: EmailStr
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = None
    role: UserRole = UserRole.WORKER
    language: str = "es"


class UserCreate(UserBase):
    """Admin-created user (within an org)."""

    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseSchema):
    """Partial user update."""

    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    role: UserRole | None = None
    language: str | None = None
    status: UserStatus | None = None


class UserResponse(UserBase, IDSchema, TimestampSchema):
    """Full user response."""

    status: UserStatus
    is_email_verified: bool
    avatar_url: str | None = None
    organization_id: UUID
    full_name: str


class UserListResponse(BaseSchema):
    """Paginated user list."""

    total: int
    page: int
    page_size: int
    items: list[UserResponse]


class AssignSitesRequest(BaseSchema):
    """Assign a user to one or more sites."""

    site_ids: list[UUID] = Field(min_length=1)


class SetPermissionsRequest(BaseSchema):
    """Set user-level module permissions override."""

    permissions: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Module name → list of allowed actions",
    )


class BulkImportResponse(BaseSchema):
    """Result of a bulk user import."""

    total: int
    created: int
    errors: list[dict[str, str]]


class ActivityLogEntry(BaseSchema):
    """Single user activity log entry."""

    action: str
    module: str | None = None
    detail: str | None = None
    ip_address: str | None = None
    timestamp: datetime


class ActivityLogResponse(BaseSchema):
    """Paginated activity log."""

    total: int
    page: int
    page_size: int
    items: list[ActivityLogEntry]


# ── Organization ─────────────────────────────────────────────

class OrganizationBase(BaseSchema):
    """Shared org fields."""

    name: str = Field(min_length=2, max_length=255)
    industry: str | None = None
    country: str | None = None
    timezone: str = "UTC"


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseSchema):
    name: str | None = None
    industry: str | None = None
    country: str | None = None
    timezone: str | None = None
    logo_url: str | None = None


class OrganizationResponse(OrganizationBase, IDSchema, TimestampSchema):
    slug: str
    logo_url: str | None = None
    is_active: bool


# ── Site ─────────────────────────────────────────────────────

class SiteBase(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=50)
    address: str | None = None
    city: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class SiteCreate(SiteBase):
    pass


class SiteUpdate(BaseSchema):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool | None = None


class SiteResponse(SiteBase, IDSchema, TimestampSchema):
    organization_id: UUID
    is_active: bool
