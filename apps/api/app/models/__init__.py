"""Models package — Todos los modelos SQLAlchemy de OpenQHSE.

Importar este módulo asegura que cada modelo esté registrado con
la Base declarativa para que Alembic auto-genere las migraciones.
"""

from app.models.base import BaseModel, SoftDeleteMixin, TimestampMixin  # noqa: F401

# ── Tenant / Users ────────────────────────────────────────────
from app.models.user import (  # noqa: F401
    Area,
    Organization,
    Site,
    User,
    UserRole,
    UserStatus,
)

# ── Forms ─────────────────────────────────────────────────────
from app.models.form import (  # noqa: F401
    FormAttachment,
    FormSubmission,
    FormTemplate,
)

# ── Inspections ───────────────────────────────────────────────
from app.models.inspection import (  # noqa: F401
    Finding,
    FindingSeverity,
    FindingStatus,
    Inspection,
    InspectionStatus,
    InspectionTemplate,
)

# ── Incidents & CAPA ─────────────────────────────────────────
from app.models.incident import (  # noqa: F401
    ActionUpdate,
    CorrectiveAction,
    Incident,
    IncidentAttachment,
    IncidentSeverity,
    IncidentStatus,
    IncidentType,
    IncidentWitness,
)

# ── Work Permits ──────────────────────────────────────────────
from app.models.permit import (  # noqa: F401
    PermitExtension,
    PermitStatus,
    PermitType,
    WorkPermit,
)

# ── Risk Management ──────────────────────────────────────────
from app.models.risk import (  # noqa: F401
    BowTie,
    HazopNode,
    HazopStudy,
    RiskRegister,
)

# ── Documents ────────────────────────────────────────────────
from app.models.document import (  # noqa: F401
    Document,
    DocumentAcknowledgment,
    DocumentVersion,
)

# ── Training / LMS ──────────────────────────────────────────
from app.models.training import (  # noqa: F401
    CompetencyMatrix,
    TrainingAssessment,
    TrainingCourse,
    TrainingEnrollment,
)

# ── Equipment ────────────────────────────────────────────────
from app.models.equipment import Equipment  # noqa: F401

# ── Behavior Based Safety (BBS) ───────────────────────────────
from app.models.observation import (  # noqa: F401
    BehaviorObservation,
    ObservationCategory,
    ObservationStatus,
    ObservationType,
)

# ── Contractors ───────────────────────────────────────────────
from app.models.contractor import (  # noqa: F401
    Contractor,
    ContractorStatus,
    ContractorWorker,
)

# ── KPI Alerts ────────────────────────────────────────────────
from app.models.kpi_alert import (  # noqa: F401
    AlertCondition,
    AlertPeriod,
    AlertStatus,
    KPIAlert,
    KPIAlertRule,
    KPIName,
)

# ── Notifications ────────────────────────────────────────────
from app.models.notification import (  # noqa: F401
    Notification,
    NotificationChannel,
    NotificationDeliveryLog,
    NotificationEvent,
    NotificationPriority,
    NotificationStatus,
    UserNotificationPreference,
)

# ── Marketplace ──────────────────────────────────────────────
from app.models.marketplace import (  # noqa: F401
    MarketplaceCategory,
    MarketplaceRating,
    MarketplaceTemplate,
    TemplateStatus,
)

# ── Audit ────────────────────────────────────────────────────
from app.models.audit_log import AuditLog  # noqa: F401

# ── KPIs ─────────────────────────────────────────────────────
from app.models.kpi import KPISnapshot  # noqa: F401
