"""Notification management endpoints.

Provides full CRUD + multi-channel dispatch, user preference management,
delivery log auditing, and bulk operations.
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.api.deps import AdminUser, CurrentUser, DBSession, Pagination
from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationDeliveryLog,
    NotificationEvent,
    NotificationStatus,
    UserNotificationPreference,
)
from app.schemas.notification import (
    BulkMarkReadRequest,
    DeliveryLogRead,
    NotificationCount,
    NotificationCreate,
    NotificationDispatchRequest,
    NotificationList,
    NotificationRead,
    UserNotificationPreferenceCreate,
    UserNotificationPreferenceRead,
    UserNotificationPreferenceUpdate,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ═══════════════════════════════════════════════════════════════
# Notification CRUD
# ═══════════════════════════════════════════════════════════════


@router.get(
    "",
    response_model=list[NotificationList],
    summary="List notifications for the current user",
)
async def list_notifications(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    unread_only: bool = False,
    channel: str | None = None,
    event_type: str | None = None,
    priority: str | None = None,
) -> list[NotificationList]:
    query = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False,  # noqa: E712
    )
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    if channel:
        query = query.where(Notification.channel == channel)
    if event_type:
        query = query.where(Notification.event_type == event_type)
    if priority:
        query = query.where(Notification.priority == priority)

    result = await db.execute(
        query.order_by(Notification.created_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    notifs = result.scalars().all()
    return [NotificationList.model_validate(n) for n in notifs]


@router.get(
    "/count",
    response_model=NotificationCount,
    summary="Get notification counts (total + unread)",
)
async def count_notifications(
    db: DBSession,
    current_user: CurrentUser,
) -> NotificationCount:
    total_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_deleted == False,  # noqa: E712
    )
    unread_q = total_q.where(Notification.read_at.is_(None))

    total = (await db.execute(total_q)).scalar_one()
    unread = (await db.execute(unread_q)).scalar_one()
    return NotificationCount(total=total, unread=unread)


@router.get(
    "/{notification_id}",
    response_model=NotificationRead,
    summary="Get a notification",
)
async def get_notification(
    notification_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> NotificationRead:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return NotificationRead.model_validate(notif)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationRead,
    summary="Mark a notification as read",
)
async def mark_as_read(
    notification_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> NotificationRead:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.read_at = datetime.now(UTC)
    notif.status = NotificationStatus.READ
    await db.flush()
    await db.refresh(notif)
    return NotificationRead.model_validate(notif)


@router.patch(
    "/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark all notifications as read",
)
async def mark_all_as_read(
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )
    notifs = result.scalars().all()
    now = datetime.now(UTC)
    for notif in notifs:
        notif.read_at = now
        notif.status = NotificationStatus.READ
    await db.flush()


@router.post(
    "/read-bulk",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark specific notifications as read",
)
async def mark_bulk_as_read(
    body: BulkMarkReadRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    result = await db.execute(
        select(Notification).where(
            Notification.id.in_(body.notification_ids),
            Notification.user_id == current_user.id,
        )
    )
    notifs = result.scalars().all()
    now = datetime.now(UTC)
    for notif in notifs:
        notif.read_at = now
        notif.status = NotificationStatus.READ
    await db.flush()


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a notification",
)
async def delete_notification(
    notification_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    notif.is_deleted = True
    notif.deleted_at = datetime.now(UTC)
    await db.flush()


# ═══════════════════════════════════════════════════════════════
# Admin: manual dispatch + create
# ═══════════════════════════════════════════════════════════════


@router.post(
    "",
    response_model=NotificationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a notification (internal / admin use)",
)
async def create_notification(
    body: NotificationCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> NotificationRead:
    notif = Notification(
        organization_id=current_user.organization_id,
        user_id=body.user_id,
        event_type=body.event_type,
        notification_type=body.notification_type,
        title=body.title,
        body=body.body,
        data=body.data,
        channel=body.channel,
        priority=body.priority,
        entity_id=body.entity_id,
        entity_type=body.entity_type,
        created_by=str(current_user.id),
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)
    return NotificationRead.model_validate(notif)


@router.post(
    "/dispatch",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Dispatch a notification event across channels (admin)",
)
async def dispatch_notification(
    body: NotificationDispatchRequest,
    db: DBSession,
    current_user: AdminUser,  # type: ignore[assignment]
) -> dict[str, str]:
    """Trigger a multi-channel notification dispatch via Celery."""
    from app.tasks.notifications import dispatch_notification_event

    dispatch_notification_event.delay(
        event_type=body.event_type,
        event_data={
            "id": body.entity_id,
            "organization_id": str(current_user.organization_id),
            **body.data,
        },
    )
    return {"status": "accepted", "event_type": body.event_type}


# ═══════════════════════════════════════════════════════════════
# Delivery Logs (audit trail)
# ═══════════════════════════════════════════════════════════════


@router.get(
    "/{notification_id}/logs",
    response_model=list[DeliveryLogRead],
    summary="Get delivery logs for a notification",
)
async def get_delivery_logs(
    notification_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[DeliveryLogRead]:
    # Verify ownership
    notif_result = await db.execute(
        select(Notification.id).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if not notif_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    result = await db.execute(
        select(NotificationDeliveryLog)
        .where(NotificationDeliveryLog.notification_id == notification_id)
        .order_by(NotificationDeliveryLog.attempted_at.desc())
    )
    logs = result.scalars().all()
    return [DeliveryLogRead.model_validate(log) for log in logs]


# ═══════════════════════════════════════════════════════════════
# User Notification Preferences
# ═══════════════════════════════════════════════════════════════


@router.get(
    "/preferences",
    response_model=list[UserNotificationPreferenceRead],
    summary="Get current user's notification preferences",
)
async def list_preferences(
    db: DBSession,
    current_user: CurrentUser,
) -> list[UserNotificationPreferenceRead]:
    result = await db.execute(
        select(UserNotificationPreference).where(
            UserNotificationPreference.user_id == current_user.id,
            UserNotificationPreference.is_deleted == False,  # noqa: E712
        )
    )
    prefs = result.scalars().all()
    return [UserNotificationPreferenceRead.model_validate(p) for p in prefs]


@router.put(
    "/preferences/{event_type}",
    response_model=UserNotificationPreferenceRead,
    summary="Create or update notification preference for an event type",
)
async def upsert_preference(
    event_type: str,
    body: UserNotificationPreferenceCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> UserNotificationPreferenceRead:
    # Validate event type
    try:
        NotificationEvent(event_type)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event type: {event_type}",
        ) from err

    # Validate channels
    for ch in body.channels:
        try:
            NotificationChannel(ch)
        except ValueError as err:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid channel: {ch}",
            ) from err

    result = await db.execute(
        select(UserNotificationPreference).where(
            UserNotificationPreference.user_id == current_user.id,
            UserNotificationPreference.event_type == event_type,
        )
    )
    pref = result.scalar_one_or_none()

    if pref:
        pref.channels = body.channels
        pref.is_enabled = body.is_enabled
        if body.whatsapp_phone is not None:
            pref.whatsapp_phone = body.whatsapp_phone
        if body.telegram_chat_id is not None:
            pref.telegram_chat_id = body.telegram_chat_id
        if body.teams_webhook_url is not None:
            pref.teams_webhook_url = body.teams_webhook_url
    else:
        pref = UserNotificationPreference(
            user_id=current_user.id,
            event_type=event_type,
            channels=body.channels,
            is_enabled=body.is_enabled,
            whatsapp_phone=body.whatsapp_phone,
            telegram_chat_id=body.telegram_chat_id,
            teams_webhook_url=body.teams_webhook_url,
        )
        db.add(pref)

    await db.flush()
    await db.refresh(pref)
    return UserNotificationPreferenceRead.model_validate(pref)


@router.patch(
    "/preferences/{event_type}",
    response_model=UserNotificationPreferenceRead,
    summary="Partially update a notification preference",
)
async def update_preference(
    event_type: str,
    body: UserNotificationPreferenceUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> UserNotificationPreferenceRead:
    result = await db.execute(
        select(UserNotificationPreference).where(
            UserNotificationPreference.user_id == current_user.id,
            UserNotificationPreference.event_type == event_type,
        )
    )
    pref = result.scalar_one_or_none()
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference for event '{event_type}' not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(pref, field_name, value)

    await db.flush()
    await db.refresh(pref)
    return UserNotificationPreferenceRead.model_validate(pref)


@router.delete(
    "/preferences/{event_type}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notification preference",
)
async def delete_preference(
    event_type: str,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    result = await db.execute(
        select(UserNotificationPreference).where(
            UserNotificationPreference.user_id == current_user.id,
            UserNotificationPreference.event_type == event_type,
        )
    )
    pref = result.scalar_one_or_none()
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Preference for event '{event_type}' not found",
        )
    pref.is_deleted = True
    pref.deleted_at = datetime.now(UTC)
    await db.flush()


# ═══════════════════════════════════════════════════════════════
# Available options (for UI dropdowns)
# ═══════════════════════════════════════════════════════════════


@router.get(
    "/meta/events",
    summary="List all available notification event types",
)
async def list_event_types() -> list[dict[str, str]]:
    return [{"value": e.value, "label": e.name.replace("_", " ").title()} for e in NotificationEvent]


@router.get(
    "/meta/channels",
    summary="List all available notification channels",
)
async def list_channels() -> list[dict[str, str]]:
    return [{"value": c.value, "label": c.name.replace("_", " ").title()} for c in NotificationChannel]
