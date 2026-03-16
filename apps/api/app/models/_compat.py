"""Dialect-agnostic column type shims.

When DATABASE_URL starts with 'sqlite', provides JSON/Uuid equivalents
so the same model definitions work with SQLite (no PostgreSQL needed).

Import pattern in every model file:
    from app.models._compat import ARRAY, JSONB, UUID
"""

from __future__ import annotations

import os

_SQLITE = os.environ.get("DATABASE_URL", "").startswith("sqlite")

if _SQLITE:
    from sqlalchemy import JSON
    from sqlalchemy.types import Uuid as _Uuid

    class UUID(_Uuid):  # type: ignore[no-redef]
        """Drop-in for postgresql.UUID — stores as VARCHAR(36) in SQLite."""

        def __init__(self, as_uuid: bool = True):  # noqa: FBT001, FBT002
            super().__init__(native_uuid=False)

    class ARRAY(JSON):  # type: ignore[no-redef]
        """Stores PostgreSQL ARRAY as JSON in SQLite."""

        def __init__(self, item_type=None):  # noqa: ANN001
            super().__init__()

    JSONB = JSON  # type: ignore[assignment, misc]

else:
    from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID  # type: ignore[assignment]  # noqa: F401
