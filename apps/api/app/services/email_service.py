"""Email service with HTML templates and retry logic.

Uses aiosmtplib for async sending, with Jinja2-style string templates.
Falls back to logging in development mode.
"""

import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


# ── HTML Templates ────────────────────────────────────────────

RESET_PASSWORD_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - OpenQHSE</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#0066FF,#0044CC);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">🛡️ OpenQHSE</h1>
        <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Plataforma QHSE Empresarial</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#e2e8f0;">
        <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">Restablecer contraseña</h2>
        <p style="line-height:1.6;margin:0 0 16px;">
          Hola <strong style="color:#60a5fa;">{user_name}</strong>,
        </p>
        <p style="line-height:1.6;margin:0 0 24px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón
          de abajo para crear una nueva contraseña:
        </p>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a href="{reset_url}" style="display:inline-block;background:#0066FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                Restablecer contraseña
              </a>
            </td>
          </tr>
        </table>
        <p style="line-height:1.6;margin:24px 0 8px;color:#94a3b8;font-size:13px;">
          Este enlace expira en <strong>1 hora</strong>.
          Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
        <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
          © {year} OpenQHSE Contributors · AGPL-3.0
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""

WELCOME_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a OpenQHSE</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#0066FF,#0044CC);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">🛡️ OpenQHSE</h1>
        <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Plataforma QHSE Empresarial</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#e2e8f0;">
        <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">¡Bienvenido a OpenQHSE!</h2>
        <p style="line-height:1.6;margin:0 0 16px;">
          Hola <strong style="color:#60a5fa;">{user_name}</strong>,
        </p>
        <p style="line-height:1.6;margin:0 0 16px;">
          Tu cuenta ha sido creada exitosamente en la organización
          <strong style="color:#60a5fa;">{organization_name}</strong>.
        </p>
        <p style="line-height:1.6;margin:0 0 8px;">Tus credenciales de acceso son:</p>
        <table style="background:#0f172a;border-radius:8px;padding:16px;width:100%;margin:0 0 24px;">
          <tr>
            <td style="padding:12px 16px;color:#94a3b8;font-size:13px;">
              <strong style="color:#e2e8f0;">Email:</strong> {email}<br/>
              <strong style="color:#e2e8f0;">Contraseña temporal:</strong> {temp_password}
            </td>
          </tr>
        </table>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a href="{login_url}" style="display:inline-block;background:#0066FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                Iniciar sesión
              </a>
            </td>
          </tr>
        </table>
        <p style="line-height:1.6;margin:24px 0 8px;color:#f59e0b;font-size:13px;">
          ⚠️ Por seguridad, cambia tu contraseña al iniciar sesión por primera vez.
        </p>
        <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
          © {year} OpenQHSE Contributors · AGPL-3.0
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""

INCIDENT_ALERT_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Incidente - OpenQHSE</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">⚠️ Alerta de Incidente</h1>
        <p style="color:#fecaca;margin:8px 0 0;font-size:14px;">OpenQHSE — Notificación urgente</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#e2e8f0;">
        <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">{incident_title}</h2>
        <table style="width:100%;margin:0 0 24px;">
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:14px;width:120px;">Severidad:</td>
            <td style="padding:8px 0;color:{severity_color};font-weight:600;font-size:14px;">{severity}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Tipo:</td>
            <td style="padding:8px 0;color:#e2e8f0;font-size:14px;">{incident_type}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Sitio:</td>
            <td style="padding:8px 0;color:#e2e8f0;font-size:14px;">{site_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Reportado por:</td>
            <td style="padding:8px 0;color:#e2e8f0;font-size:14px;">{reporter_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Fecha:</td>
            <td style="padding:8px 0;color:#e2e8f0;font-size:14px;">{occurred_at}</td>
          </tr>
        </table>
        <p style="line-height:1.6;margin:0 0 24px;color:#cbd5e1;font-size:14px;">{description}</p>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a href="{incident_url}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                Ver incidente
              </a>
            </td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
          © {year} OpenQHSE Contributors · AGPL-3.0
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""

ACTION_NOTIFICATION_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación de Acción - OpenQHSE</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1e293b;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#0066FF,#0044CC);padding:32px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">🛡️ OpenQHSE</h1>
        <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">Notificación de acción</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;color:#e2e8f0;">
        <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">{action_title}</h2>
        <p style="line-height:1.6;margin:0 0 16px;">
          Hola <strong style="color:#60a5fa;">{user_name}</strong>,
        </p>
        <p style="line-height:1.6;margin:0 0 24px;">{action_description}</p>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="center">
              <a href="{action_url}" style="display:inline-block;background:#0066FF;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
                Ver detalles
              </a>
            </td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />
        <p style="color:#64748b;font-size:12px;margin:0;text-align:center;">
          © {year} OpenQHSE Contributors · AGPL-3.0
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
"""


# ── Email Sending Core ────────────────────────────────────────


async def _send_email_smtp(
    to_email: str,
    subject: str,
    html_body: str,
) -> None:
    """Send an email via SMTP with retry logic."""
    import aiosmtplib

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user or None,
                password=settings.smtp_password or None,
                use_tls=settings.smtp_port == 465,
                start_tls=settings.smtp_port == 587,
            )
            logger.info(f"Email sent to {to_email} (attempt {attempt})")
            return
        except Exception as exc:
            logger.warning(f"Email send attempt {attempt} failed: {exc}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY_SECONDS * attempt)
            else:
                logger.error(f"Failed to send email to {to_email} after {MAX_RETRIES} attempts")
                raise


async def send_email(to_email: str, subject: str, html_body: str) -> None:
    """Public email send function. Uses SMTP in production, logs in dev."""
    if settings.environment == "development" and settings.smtp_host == "localhost":
        logger.info(
            f"[DEV] Email to={to_email} subject='{subject}' (not sent — dev mode)"
        )
        return

    await _send_email_smtp(to_email, subject, html_body)


# ── Template-based Convenience Functions ──────────────────────


async def send_password_reset_email(
    to_email: str,
    user_name: str,
    reset_url: str,
) -> None:
    """Send a password reset email."""
    from datetime import datetime

    html = RESET_PASSWORD_TEMPLATE.format(
        user_name=user_name,
        reset_url=reset_url,
        year=datetime.now().year,
    )
    await send_email(to_email, "Restablecer contraseña — OpenQHSE", html)


async def send_welcome_email(
    to_email: str,
    user_name: str,
    organization_name: str,
    temp_password: str,
    login_url: str,
) -> None:
    """Send a welcome email with temporary credentials."""
    from datetime import datetime

    html = WELCOME_TEMPLATE.format(
        user_name=user_name,
        organization_name=organization_name,
        email=to_email,
        temp_password=temp_password,
        login_url=login_url,
        year=datetime.now().year,
    )
    await send_email(to_email, "Bienvenido a OpenQHSE", html)


async def send_incident_alert(
    to_email: str,
    incident_title: str,
    severity: str,
    incident_type: str,
    site_name: str,
    reporter_name: str,
    occurred_at: str,
    description: str,
    incident_url: str,
) -> None:
    """Send an urgent incident alert email."""
    from datetime import datetime

    severity_colors = {
        "catastrophic": "#dc2626",
        "critical": "#f97316",
        "serious": "#f59e0b",
        "moderate": "#eab308",
        "minor": "#22c55e",
    }
    html = INCIDENT_ALERT_TEMPLATE.format(
        incident_title=incident_title,
        severity=severity,
        severity_color=severity_colors.get(severity, "#94a3b8"),
        incident_type=incident_type,
        site_name=site_name,
        reporter_name=reporter_name,
        occurred_at=occurred_at,
        description=description,
        incident_url=incident_url,
        year=datetime.now().year,
    )
    await send_email(
        to_email,
        f"🚨 Alerta: {incident_title} — OpenQHSE",
        html,
    )


async def send_action_notification(
    to_email: str,
    user_name: str,
    action_title: str,
    action_description: str,
    action_url: str,
) -> None:
    """Send a generic action notification email."""
    from datetime import datetime

    html = ACTION_NOTIFICATION_TEMPLATE.format(
        user_name=user_name,
        action_title=action_title,
        action_description=action_description,
        action_url=action_url,
        year=datetime.now().year,
    )
    await send_email(to_email, f"{action_title} — OpenQHSE", html)
