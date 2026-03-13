"""Pydantic schemas for the multi-channel notification system."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Notification CRUD ─────────────────────────────────────────


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    notification_type: str
    title: str
    body: str
    data: dict[str, Any] | None = None
    channel: str = "in_app"
    event_type: str = "system_announcement"
    priority: str = "normal"
    entity_id: str | None = None
    entity_type: str | None = None


class NotificationRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    event_type: str
    notification_type: str
    title: str
    body: str
    data: dict[str, Any] | None
    channel: str
    status: str
    priority: str
    entity_id: str | None
    entity_type: str | None
    sent_at: datetime | None
    delivered_at: datetime | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationList(BaseModel):
    id: uuid.UUID
    event_type: str
    notification_type: str
    title: str
    body: str
    channel: str
    status: str
    priority: str
    entity_id: str | None
    entity_type: str | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCount(BaseModel):
    total: int
    unread: int


# ── Delivery Log ──────────────────────────────────────────────


class DeliveryLogRead(BaseModel):
    id: uuid.UUID
    notification_id: uuid.UUID
    channel: str
    status: str
    provider_response: dict[str, Any] | None
    error_message: str | None
    attempted_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


# ── User Notification Preferences ─────────────────────────────


class UserNotificationPreferenceCreate(BaseModel):
    event_type: str
    channels: list[str] = Field(default_factory=lambda: ["in_app"])
    is_enabled: bool = True
    whatsapp_phone: str | None = None
    telegram_chat_id: str | None = None
    teams_webhook_url: str | None = None


class UserNotificationPreferenceUpdate(BaseModel):
    channels: list[str] | None = None
    is_enabled: bool | None = None
    whatsapp_phone: str | None = None
    telegram_chat_id: str | None = None
    teams_webhook_url: str | None = None


class UserNotificationPreferenceRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    event_type: str
    channels: list[str]
    is_enabled: bool
    whatsapp_phone: str | None
    telegram_chat_id: str | None
    teams_webhook_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Dispatch request (internal) ───────────────────────────────


class NotificationDispatchRequest(BaseModel):
    """Payload sent from the application layer to trigger notifications."""

    event_type: str
    entity_id: str
    entity_type: str
    recipients: list[str]  # user_id strings
    channels: list[str] | None = None  # override user prefs
    data: dict[str, Any] = Field(default_factory=dict)
    priority: str = "normal"


# ── Bulk actions ──────────────────────────────────────────────


class BulkMarkReadRequest(BaseModel):
    notification_ids: list[uuid.UUID]
