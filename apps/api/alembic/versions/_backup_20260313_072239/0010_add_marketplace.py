"""add marketplace tables

Revision ID: 0010_marketplace
Revises: 0009_multichannel_notif
Create Date: 2026-03-10

Adds:
  - marketplace_templates table
  - marketplace_ratings table
"""

from alembic import op  # type: ignore[attr-defined]
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0010_marketplace"
down_revision = "0009_multichannel_notif"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── marketplace_templates ─────────────────────────────
    op.create_table(
        "marketplace_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("slug", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("short_description", sa.String(500), nullable=False, server_default=""),
        sa.Column("version", sa.String(20), nullable=False, server_default="1.0.0"),
        sa.Column("language", sa.String(10), nullable=False, server_default="es", index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="published", index=True),
        sa.Column("is_featured", sa.Boolean(), default=False, index=True),
        # Classification
        sa.Column("category", sa.String(50), nullable=False, index=True),
        sa.Column("industry", sa.String(100), nullable=False, index=True),
        sa.Column("standards", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        # Template data
        sa.Column("schema_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("question_count", sa.Integer(), default=0),
        sa.Column("section_count", sa.Integer(), default=0),
        sa.Column("estimated_duration_minutes", sa.Integer(), default=15),
        sa.Column("scoring_config", postgresql.JSONB(), nullable=True),
        # Stats
        sa.Column("download_count", sa.Integer(), default=0),
        sa.Column("import_count", sa.Integer(), default=0),
        sa.Column("rating_average", sa.Float(), default=0.0),
        sa.Column("rating_count", sa.Integer(), default=0),
        # Contributor
        sa.Column("contributor_name", sa.String(255), nullable=False, server_default="OpenQHSE Team"),
        sa.Column("contributor_org", sa.String(255), nullable=True),
        sa.Column(
            "contributor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("preview_image_url", sa.String(512), nullable=True),
        # Audit
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), default=False),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("updated_by", sa.String(255), nullable=True),
    )

    # ── marketplace_ratings ───────────────────────────────
    op.create_table(
        "marketplace_ratings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("marketplace_templates.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("review", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), default=False),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("updated_by", sa.String(255), nullable=True),
    )

    op.create_unique_constraint(
        "uq_marketplace_rating_template_user",
        "marketplace_ratings",
        ["template_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_table("marketplace_ratings")
    op.drop_table("marketplace_templates")
