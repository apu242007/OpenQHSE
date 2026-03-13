"""Shared / base schemas used across the application."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base Pydantic schema with common config."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class TimestampSchema(BaseSchema):
    """Schema mixin with audit timestamps."""

    created_at: datetime
    updated_at: datetime


class IDSchema(BaseSchema):
    """Schema with UUID id."""

    id: UUID


class PaginationParams(BaseSchema):
    """Query parameters for paginated endpoints."""

    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseSchema):
    """Generic paginated response wrapper."""

    total: int
    page: int
    page_size: int
    total_pages: int
    items: list  # type: ignore[type-arg]


class MessageResponse(BaseSchema):
    """Simple message response."""

    message: str
    detail: str | None = None


class HealthResponse(BaseSchema):
    """Health check response."""

    status: str
    version: str
    environment: str
    database: str
    redis: str
