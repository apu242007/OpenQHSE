"""Marketplace template data packages — one module per industry group."""
from .safety_templates import SAFETY_TEMPLATES
from .oil_gas_templates import OIL_GAS_TEMPLATES, MINING_TEMPLATES  # both defined in oil_gas_templates
from .construction_env_templates import CONSTRUCTION_ENV_TEMPLATES
from .quality_health_templates import QUALITY_HEALTH_TEMPLATES

ALL_TEMPLATES = (
    SAFETY_TEMPLATES
    + OIL_GAS_TEMPLATES
    + MINING_TEMPLATES
    + CONSTRUCTION_ENV_TEMPLATES
    + QUALITY_HEALTH_TEMPLATES
)

__all__ = ["ALL_TEMPLATES"]
