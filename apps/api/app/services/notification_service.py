"""Unified multi-channel notification service.

Dispatches notifications to: IN_APP, EMAIL, WHATSAPP, TELEGRAM, TEAMS, PUSH.
Respects per-user channel preferences and provides retry / audit logging.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

import httpx  # type: ignore[import-untyped]
from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.logging import get_logger
from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationDeliveryLog,
    NotificationEvent,
    NotificationPriority,
    NotificationStatus,
    UserNotificationPreference,
)
from app.models.user import User
from app.services.notification_templates import (
    NOTIFICATION_COPY,
    TELEGRAM_TEMPLATES,
    WHATSAPP_TEMPLATES,
    build_notification_email,
    build_teams_card,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger("notification_service")
settings = get_settings()


class NotificationService:
    """Unified multi-channel notification dispatcher."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ──────────────────────────────────────────────────────────
    #  PUBLIC: Main entry point
    # ──────────────────────────────────────────────────────────

    async def notify(
        self,
        event_type: NotificationEvent,
        entity_id: str,
        recipients: list[str],  # user_ids as strings
        channels: list[NotificationChannel] | None = None,
        data: dict[str, Any] | None = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        entity_type: str = "",
    ) -> list[Notification]:
        """Dispatch notifications to all recipients across configured channels.

        If *channels* is None the user's stored preferences are used; if
        no preferences exist the platform defaults apply.

        Returns the list of Notification rows created.
        """
        data = data or {}
        created: list[Notification] = []

        for user_id_str in recipients:
            user = await self._get_user(user_id_str)
            if user is None:
                logger.warning("Recipient not found, skipping", user_id=user_id_str)
                continue

            target_channels = channels or await self._resolve_channels(user_id_str, event_type)

            # Build copy from templates
            copy = self._build_copy(event_type, data)

            for channel in target_channels:
                notif = Notification(
                    organization_id=user.organization_id,
                    user_id=user.id,
                    event_type=event_type,
                    notification_type=event_type.value,
                    title=copy["title"],
                    body=copy["body"],
                    data=data,
                    channel=channel,
                    status=NotificationStatus.PENDING,
                    priority=priority,
                    entity_id=entity_id,
                    entity_type=entity_type,
                )
                self.db.add(notif)
                await self.db.flush()
                await self.db.refresh(notif)

                # Attempt delivery
                await self._dispatch(notif, user, data)
                created.append(notif)

        await self.db.flush()
        return created

    # ──────────────────────────────────────────────────────────
    #  CHANNEL DISPATCHERS
    # ──────────────────────────────────────────────────────────

    async def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        attachments: list[Any] | None = None,
    ) -> dict[str, Any]:
        """Send an email via the existing email service."""
        from app.services.email_service import send_email

        try:
            await send_email(to, subject, html_body)
            return {"status": "sent", "to": to}
        except Exception as exc:
            logger.error("Email delivery failed", to=to, error=str(exc))
            return {"status": "failed", "to": to, "error": str(exc)}

    async def send_whatsapp(
        self,
        phone: str,
        message: str,
        template: str,
        params: dict[str, Any],
    ) -> dict[str, Any]:
        """Send a WhatsApp message via Meta Cloud API.

        Uses pre-approved templates with dynamic parameters.
        """
        if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
            logger.warning("WhatsApp not configured, skipping")
            return {"status": "skipped", "reason": "not_configured"}

        wa_template = WHATSAPP_TEMPLATES.get(template)
        if wa_template is None:
            logger.warning("WhatsApp template not found", template=template)
            return {"status": "failed", "error": "template_not_found"}

        url = f"{settings.whatsapp_api_url}/{settings.whatsapp_phone_number_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": phone.replace("+", "").replace(" ", ""),
            "type": "template",
            "template": {
                "name": wa_template.name,
                "language": {"code": wa_template.language},
                "components": self._fill_wa_components(wa_template.components, params),
            },
        }
        headers = {
            "Authorization": f"Bearer {settings.whatsapp_access_token}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                return {"status": "sent", "response": resp.json()}
        except httpx.HTTPStatusError as exc:
            body = exc.response.text if exc.response else str(exc)
            logger.error("WhatsApp API error", error=body)
            return {"status": "failed", "error": body}
        except Exception as exc:
            logger.error("WhatsApp send error", error=str(exc))
            return {"status": "failed", "error": str(exc)}

    async def send_telegram(
        self,
        chat_id: str,
        message: str,
        parse_mode: str = "HTML",
    ) -> dict[str, Any]:
        """Send a Telegram message via Bot API."""
        if not settings.telegram_bot_token:
            logger.warning("Telegram not configured, skipping")
            return {"status": "skipped", "reason": "not_configured"}

        url = f"{settings.telegram_api_url}/bot{settings.telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": parse_mode,
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                return {"status": "sent", "response": resp.json()}
        except Exception as exc:
            logger.error("Telegram send error", chat_id=chat_id, error=str(exc))
            return {"status": "failed", "error": str(exc)}

    async def send_teams(
        self,
        webhook_url: str,
        card: dict[str, Any],
    ) -> dict[str, Any]:
        """Post an Adaptive Card to a Microsoft Teams webhook."""
        if not webhook_url:
            logger.warning("Teams webhook URL empty, skipping")
            return {"status": "skipped", "reason": "no_webhook"}

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    webhook_url,
                    json=card,
                    headers={"Content-Type": "application/json"},
                )
                resp.raise_for_status()
                return {"status": "sent"}
        except Exception as exc:
            logger.error("Teams send error", error=str(exc))
            return {"status": "failed", "error": str(exc)}

    async def send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Send a push notification via Expo Push API."""
        push_token = await self._get_push_token(user_id)
        if not push_token:
            logger.info("No push token for user, skipping", user_id=user_id)
            return {"status": "skipped", "reason": "no_push_token"}

        payload = {
            "to": push_token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "priority": "high",
            "channelId": "openqhse-alerts",
        }
        headers: dict[str, str] = {
            "Content-Type": "application/json",
        }
        if settings.expo_access_token:
            headers["Authorization"] = f"Bearer {settings.expo_access_token}"

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(settings.expo_push_url, json=payload, headers=headers)
                resp.raise_for_status()
                return {"status": "sent", "response": resp.json()}
        except Exception as exc:
            logger.error("Push send error", user_id=user_id, error=str(exc))
            return {"status": "failed", "error": str(exc)}

    async def create_in_app(
        self,
        user_id: str,
        notification: dict[str, Any],
    ) -> dict[str, Any]:
        """The in-app notification is the DB row itself — just mark it sent."""
        return {"status": "sent", "channel": "in_app"}

    # ──────────────────────────────────────────────────────────
    #  PRIVATE HELPERS
    # ──────────────────────────────────────────────────────────

    async def _dispatch(
        self,
        notif: Notification,
        user: User,
        data: dict[str, Any],
    ) -> None:
        """Route a single notification to the appropriate channel handler."""
        now = datetime.now(UTC)
        result: dict[str, Any] = {}

        try:
            match notif.channel:
                case NotificationChannel.IN_APP:
                    result = await self.create_in_app(str(user.id), data)

                case NotificationChannel.EMAIL:
                    subject, html = build_notification_email(
                        notif.event_type, {**data, "recipient_name": user.full_name}
                    )
                    result = await self.send_email(user.email, subject, html)

                case NotificationChannel.WHATSAPP:
                    phone = await self._get_whatsapp_phone(str(user.id), notif.event_type) or user.phone
                    if phone:
                        result = await self.send_whatsapp(phone, notif.body, notif.event_type, data)
                    else:
                        result = {"status": "skipped", "reason": "no_phone"}

                case NotificationChannel.TELEGRAM:
                    chat_id = await self._get_telegram_chat_id(str(user.id), notif.event_type)
                    if chat_id:
                        tpl = TELEGRAM_TEMPLATES.get(notif.event_type, "")
                        msg = tpl.format(**data) if tpl else notif.body
                        result = await self.send_telegram(chat_id, msg)
                    else:
                        result = {"status": "skipped", "reason": "no_chat_id"}

                case NotificationChannel.TEAMS:
                    webhook = await self._get_teams_webhook(str(user.id), notif.event_type)
                    if webhook:
                        card = build_teams_card(notif.event_type, data)
                        result = await self.send_teams(webhook, card)
                    else:
                        result = {"status": "skipped", "reason": "no_webhook"}

                case NotificationChannel.PUSH:
                    result = await self.send_push(str(user.id), notif.title, notif.body, data)

            # Update notification status
            status_str = result.get("status", "failed")
            if status_str == "sent":
                notif.status = NotificationStatus.SENT
                notif.sent_at = now
            elif status_str == "skipped":
                notif.status = NotificationStatus.SENT  # non-blocking skip
                notif.error_message = result.get("reason")
            else:
                notif.status = NotificationStatus.FAILED
                notif.error_message = result.get("error", "unknown")
                notif.retry_count += 1

        except Exception as exc:
            notif.status = NotificationStatus.FAILED
            notif.error_message = str(exc)
            notif.retry_count += 1
            result = {"status": "failed", "error": str(exc)}
            logger.error(
                "Dispatch exception",
                channel=notif.channel,
                user_id=str(user.id),
                error=str(exc),
            )

        # Audit log entry
        log = NotificationDeliveryLog(
            notification_id=notif.id,
            channel=notif.channel,
            status=notif.status,
            provider_response=result,
            error_message=result.get("error"),
            attempted_at=now,
        )
        self.db.add(log)

    # ── Preference resolution ─────────────────────────────

    async def _resolve_channels(
        self,
        user_id: str,
        event_type: NotificationEvent,
    ) -> list[NotificationChannel]:
        """Look up user preferences; fall back to platform defaults."""
        result = await self.db.execute(
            select(UserNotificationPreference).where(
                UserNotificationPreference.user_id == uuid.UUID(user_id),
                UserNotificationPreference.event_type == event_type,
                UserNotificationPreference.is_enabled == True,  # noqa: E712
            )
        )
        pref = result.scalar_one_or_none()
        if pref:
            return [NotificationChannel(ch) for ch in pref.channels]

        # Platform defaults from settings
        defaults = settings.notification_default_channels.split(",")
        return [NotificationChannel(ch.strip()) for ch in defaults]

    # ── Contact-info helpers ──────────────────────────────

    async def _get_user(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        return result.scalar_one_or_none()

    async def _get_push_token(self, user_id: str) -> str | None:
        """Retrieve the Expo push token from Redis or DB.

        For now returns None — implemented once mobile registers tokens.
        """
        try:
            from app.core.redis import redis_client

            token = await redis_client.get(f"push_token:{user_id}")
            return token  # type: ignore[return-value]
        except Exception:
            return None

    async def _get_whatsapp_phone(self, user_id: str, event_type: str) -> str | None:
        result = await self.db.execute(
            select(UserNotificationPreference.whatsapp_phone).where(
                UserNotificationPreference.user_id == uuid.UUID(user_id),
                UserNotificationPreference.event_type == event_type,
            )
        )
        return result.scalar_one_or_none()

    async def _get_telegram_chat_id(self, user_id: str, event_type: str) -> str | None:
        result = await self.db.execute(
            select(UserNotificationPreference.telegram_chat_id).where(
                UserNotificationPreference.user_id == uuid.UUID(user_id),
                UserNotificationPreference.event_type == event_type,
            )
        )
        return result.scalar_one_or_none()

    async def _get_teams_webhook(self, user_id: str, event_type: str) -> str | None:
        result = await self.db.execute(
            select(UserNotificationPreference.teams_webhook_url).where(
                UserNotificationPreference.user_id == uuid.UUID(user_id),
                UserNotificationPreference.event_type == event_type,
            )
        )
        val = result.scalar_one_or_none()
        return val or settings.teams_default_webhook_url or None

    # ── Copy builder ──────────────────────────────────────

    @staticmethod
    def _build_copy(event_type: str, data: dict[str, Any]) -> dict[str, str]:
        """Render title / body from NOTIFICATION_COPY templates."""
        templates = NOTIFICATION_COPY.get(event_type, NOTIFICATION_COPY["system_announcement"])
        try:
            return {
                "title": templates["title"].format(**data),
                "body": templates["body"].format(**data),
            }
        except KeyError:
            return {
                "title": data.get("title", "OpenQHSE"),
                "body": data.get("body", ""),
            }

    # ── WhatsApp component filler ─────────────────────────

    @staticmethod
    def _fill_wa_components(
        components: list[dict[str, Any]],
        params: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Replace {{var}} placeholders in WhatsApp template components."""
        import copy
        import re

        filled = copy.deepcopy(components)
        for comp in filled:
            for param in comp.get("parameters", []):
                if param.get("type") == "text":
                    text = param["text"]
                    # Replace {{key}} with actual values
                    for match in re.findall(r"\{\{(\w+)\}\}", text):
                        if match in params:
                            text = text.replace(f"{{{{{match}}}}}", str(params[match]))
                    param["text"] = text
        return filled

    # ──────────────────────────────────────────────────────────
    #  CONVENIENCE: Count unread
    # ──────────────────────────────────────────────────────────

    async def count_unread(self, user_id: str) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == uuid.UUID(user_id),
                Notification.read_at.is_(None),
                Notification.is_deleted == False,  # noqa: E712
            )
        )
        return result.scalar_one()
