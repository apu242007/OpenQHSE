"""add multichannel notification tables

Revision ID: 0009_multichannel_notif
Revises: 
Create Date: 2026-03-09

Adds:
  - New columns on notifications table (event_type, priority, entity_id, etc.)
  - notification_delivery_logs table
  - user_notification_preferences table
"""

from alembic import op  # type: ignore[attr-defined]
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0009_multichannel_notif"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Extend notifications table ────────────────────────
    op.add_column(
        "notifications",
        sa.Column("event_type", sa.String(50), nullable=True, index=True),
    )
    op.add_column(
        "notifications",
        sa.Column("priority", sa.String(10), nullable=True, server_default="normal", index=True),
    )
    op.add_column(
        "notifications",
        sa.Column("entity_id", sa.String(36), nullable=True, index=True),
    )
    op.add_column(
        "notifications",
        sa.Column("entity_type", sa.String(50), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("retry_count", sa.Integer(), nullable=True, server_default="0"),
    )
    op.add_column(
        "notifications",
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.add_column(
        "notifications",
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Back-fill event_type from notification_type for existing rows
    op.execute("UPDATE notifications SET event_type = notification_type WHERE event_type IS NULL")

    # ── notification_delivery_logs table ──────────────────
    op.create_table(
        "notification_delivery_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("notification_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("notifications.id"), nullable=False, index=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_response", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), default=False),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("updated_by", sa.String(255), nullable=True),
    )

    # ── user_notification_preferences table ───────────────
    op.create_table(
        "user_notification_preferences",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("channels", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("is_enabled", sa.Boolean(), default=True),
        sa.Column("whatsapp_phone", sa.String(20), nullable=True),
        sa.Column("telegram_chat_id", sa.String(50), nullable=True),
        sa.Column("teams_webhook_url", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), default=False),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("updated_by", sa.String(255), nullable=True),
    )

    # Unique constraint: one preference per user per event
    op.create_unique_constraint(
        "uq_user_notification_pref_user_event",
        "user_notification_preferences",
        ["user_id", "event_type"],
    )


def downgrade() -> None:
    op.drop_table("user_notification_preferences")
    op.drop_table("notification_delivery_logs")

    op.drop_column("notifications", "delivered_at")
    op.drop_column("notifications", "error_message")
    op.drop_column("notifications", "retry_count")
    op.drop_column("notifications", "entity_type")
    op.drop_column("notifications", "entity_id")
    op.drop_column("notifications", "priority")
    op.drop_column("notifications", "event_type")
