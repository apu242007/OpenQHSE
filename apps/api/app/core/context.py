"""Request-scoped ContextVars for user/org identity.

Estos valores son seteados en deps.py después de autenticar al usuario
y usados por:
  - models/base.py → eventos SQLAlchemy para auto-poblar created_by/updated_by
  - core/database.py → SET LOCAL app.current_org_id para PostgreSQL RLS
"""

from contextvars import ContextVar

# ID del usuario autenticado (str UUID) — usado en eventos before_insert/before_update
current_user_id: ContextVar[str | None] = ContextVar("current_user_id", default=None)

# ID de la organización del usuario — usado para SET LOCAL app.current_org_id (RLS)
current_org_id: ContextVar[str | None] = ContextVar("current_org_id", default=None)
