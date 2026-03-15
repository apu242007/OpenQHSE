"""Notification model for multi-channel alerts."""

from __future__ import annotations

from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    import uuid
    from datetime import datetime

# ── Enums ─────────────────────────────────────────────────────


class NotificationChannel(StrEnum):
    """Supported delivery channels."""

    IN_APP = "in_app"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    TEAMS = "teams"
    PUSH = "push"


class NotificationStatus(StrEnum):
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class NotificationEvent(StrEnum):
    """All platform events that trigger notifications."""

    # Incidents
    INCIDENT_REPORTED = "incident_reported"
    INCIDENT_CRITICAL = "incident_critical"
    INCIDENT_STATUS_CHANGED = "incident_status_changed"

    # Corrective Actions
    ACTION_ASSIGNED = "action_assigned"
    ACTION_OVERDUE = "action_overdue"
    ACTION_ESCALATED = "action_escalated"
    ACTION_COMPLETED = "action_completed"

    # Inspections
    INSPECTION_ASSIGNED = "inspection_assigned"
    INSPECTION_OVERDUE = "inspection_overdue"
    INSPECTION_COMPLETED = "inspection_completed"

    # Work Permits
    PERMIT_PENDING_APPROVAL = "permit_pending_approval"
    PERMIT_APPROVED = "permit_approved"
    PERMIT_REJECTED = "permit_rejected"
    PERMIT_EXPIRING_SOON = "permit_expiring_soon"
    PERMIT_EXPIRED = "permit_expired"

    # Documents
    DOCUMENT_REVIEW_DUE = "document_review_due"
    DOCUMENT_APPROVED = "document_approved"
    DOCUMENT_EXPIRED = "document_expired"

    # Training
    TRAINING_ASSIGNED = "training_assigned"
    TRAINING_EXPIRING = "training_expiring"
    TRAINING_COMPLETED = "training_completed"

    # Risk
    HIGH_RISK_DETECTED = "high_risk_detected"

    # General
    SYSTEM_ANNOUNCEMENT = "system_announcement"


class NotificationPriority(StrEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


# ── Models ────────────────────────────────────────────────────


class Notification(BaseModel):
    """User notification dispatched across multiple channels."""

    __tablename__ = "notifications"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    event_type: Mapped[NotificationEvent] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="The platform event that originated this notification.",
    )
    notification_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        doc="Human-readable type, e.g. 'inspection_assigned'.",
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSONB,
        nullable=True,
        doc="Payload: {entity_type, entity_id, action_url, extra}",
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        String(20), default=NotificationChannel.IN_APP, nullable=False, index=True
    )
    status: Mapped[NotificationStatus] = mapped_column(
        String(20), default=NotificationStatus.PENDING, nullable=False, index=True
    )
    priority: Mapped[NotificationPriority] = mapped_column(
        String(10), default=NotificationPriority.NORMAL, nullable=False, index=True
    )
    entity_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        doc="UUID of the related entity (incident, action, etc.)",
    )
    entity_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        doc="Type of the related entity: incident, action, inspection …",
    )
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationship back to logs
    delivery_logs: Mapped[list[NotificationDeliveryLog]] = relationship(
        "NotificationDeliveryLog", back_populates="notification", lazy="selectin"
    )


class NotificationDeliveryLog(BaseModel):
    """Audit trail for every delivery attempt."""

    __tablename__ = "notification_delivery_logs"

    notification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notifications.id"), nullable=False, index=True
    )
    channel: Mapped[NotificationChannel] = mapped_column(String(20), nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(String(20), nullable=False)
    provider_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    notification: Mapped[Notification] = relationship("Notification", back_populates="delivery_logs")


class UserNotificationPreference(BaseModel):
    """Per-user channel preferences for each event type."""

    __tablename__ = "user_notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    event_type: Mapped[NotificationEvent] = mapped_column(String(50), nullable=False)
    channels: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=["in_app"],
        doc="List of channel strings the user has enabled for this event.",
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # External contact info (overrides user defaults)
    whatsapp_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    teams_webhook_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
