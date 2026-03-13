"""Document management / controlled documents endpoints."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.document import (
    Document,
    DocumentAcknowledgment,
    DocumentStatus,
    DocumentVersion,
)
from app.schemas.document import (
    DocumentAcknowledgmentCreate,
    DocumentAcknowledgmentRead,
    DocumentCreate,
    DocumentList,
    DocumentRead,
    DocumentUpdate,
    DocumentVersionCreate,
    DocumentVersionRead,
)

router = APIRouter(prefix="/documents", tags=["Documents"])


# ── Documents ─────────────────────────────────────────────────


@router.get(
    "",
    response_model=list[DocumentList],
    summary="List controlled documents",
)
async def list_documents(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    doc_type: str | None = None,
    doc_status: str | None = None,
    site_id: UUID | None = None,
    category: str | None = None,
    search: str | None = None,
    days_to_expiry: int | None = Query(None, description="Filter docs expiring within N days"),
) -> list[DocumentList]:
    query = select(Document).where(
        Document.organization_id == current_user.organization_id,
        Document.is_deleted == False,  # noqa: E712
    )
    if doc_type:
        query = query.where(Document.doc_type == doc_type)
    if doc_status:
        query = query.where(Document.status == doc_status)
    if site_id:
        query = query.where(Document.site_id == site_id)
    if category:
        query = query.where(Document.category == category)
    if search:
        query = query.where(
            Document.title.ilike(f"%{search}%") | Document.code.ilike(f"%{search}%")
        )
    if days_to_expiry is not None:
        cutoff = datetime.now(UTC) + timedelta(days=days_to_expiry)
        query = query.where(
            Document.expiry_date.is_not(None),
            Document.expiry_date <= cutoff,
            Document.expiry_date >= datetime.now(UTC),
        )

    result = await db.execute(
        query.order_by(Document.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    docs = result.scalars().all()
    return [DocumentList.model_validate(d) for d in docs]


@router.post(
    "",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a controlled document",
)
async def create_document(
    body: DocumentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> DocumentRead:
    doc = Document(
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        doc_type=body.doc_type,
        code=body.code,
        title=body.title,
        description=body.description,
        category=body.category,
        tags=body.tags,
        file_url=body.file_url,
        file_size=body.file_size,
        file_type=body.file_type,
        owner_id=current_user.id,
        approver_id=body.approver_id,
        effective_date=body.effective_date,
        review_date=body.review_date,
        expiry_date=body.expiry_date,
        distribution_list=body.distribution_list,
        created_by=str(current_user.id),
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return DocumentRead.model_validate(doc)


@router.get(
    "/expiring",
    response_model=list[DocumentList],
    summary="Get documents expiring within N days",
)
async def get_expiring_documents(
    db: DBSession,
    current_user: CurrentUser,
    days: int = Query(30, ge=1, le=365),
) -> list[DocumentList]:
    cutoff = datetime.now(UTC) + timedelta(days=days)
    result = await db.execute(
        select(Document).where(
            Document.organization_id == current_user.organization_id,
            Document.is_deleted == False,  # noqa: E712
            Document.expiry_date.is_not(None),
            Document.expiry_date <= cutoff,
            Document.expiry_date >= datetime.now(UTC),
            Document.status == DocumentStatus.APPROVED,
        ).order_by(Document.expiry_date.asc())
    )
    docs = result.scalars().all()
    return [DocumentList.model_validate(d) for d in docs]


@router.get(
    "/report",
    summary="Generate Excel report of document state",
)
async def download_document_report(
    db: DBSession,
    manager: ManagerUser,
    doc_type: str | None = None,
    doc_status: str | None = None,
    days_to_expiry: int | None = None,
) -> Response:
    from app.services.document_service import generate_document_report

    filters = {
        "organization_id": manager.organization_id,
        "doc_type": doc_type,
        "status": doc_status,
        "days_to_expiry": days_to_expiry,
    }
    xlsx_bytes = await generate_document_report(filters, db)
    filename = f"documentos_{datetime.now(UTC).strftime('%Y%m%d_%H%M')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/{document_id}",
    response_model=DocumentRead,
    summary="Get document detail",
)
async def get_document(
    document_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> DocumentRead:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentRead.model_validate(doc)


@router.patch(
    "/{document_id}",
    response_model=DocumentRead,
    summary="Update a controlled document",
)
async def update_document(
    document_id: UUID,
    body: DocumentUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> DocumentRead:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == manager.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    update_data = body.model_dump(exclude_unset=True)
    new_status = update_data.get("status")
    if new_status == DocumentStatus.APPROVED:
        doc.effective_date = datetime.now(UTC)
        # Auto-archive superseded versions asynchronously
        from app.services.document_service import auto_archive_superseded_versions
        await auto_archive_superseded_versions(document_id, db)
    elif new_status == DocumentStatus.UNDER_REVIEW:
        # Notify reviewers
        from app.services.document_service import notify_reviewers_for_approval
        await notify_reviewers_for_approval(document_id, db)

    for field, value in update_data.items():
        setattr(doc, field, value)
    doc.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(doc)
    return DocumentRead.model_validate(doc)


@router.post(
    "/{document_id}/submit-for-approval",
    response_model=DocumentRead,
    summary="Submit document for approval review",
)
async def submit_for_approval(
    document_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> DocumentRead:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.status != DocumentStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT documents can be submitted for review",
        )

    doc.status = DocumentStatus.UNDER_REVIEW
    doc.updated_by = str(current_user.id)
    await db.flush()

    from app.services.document_service import notify_reviewers_for_approval
    await notify_reviewers_for_approval(document_id, db)

    await db.refresh(doc)
    return DocumentRead.model_validate(doc)


@router.post(
    "/{document_id}/approve",
    response_model=DocumentRead,
    summary="Approve a document",
)
async def approve_document(
    document_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> DocumentRead:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == manager.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.status != DocumentStatus.UNDER_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only UNDER_REVIEW documents can be approved",
        )

    doc.status = DocumentStatus.APPROVED
    doc.approver_id = manager.id
    doc.effective_date = datetime.now(UTC)
    doc.updated_by = str(manager.id)

    from app.services.document_service import auto_archive_superseded_versions
    await auto_archive_superseded_versions(document_id, db)

    await db.flush()
    await db.refresh(doc)
    return DocumentRead.model_validate(doc)


# ── Document Versions ─────────────────────────────────────────


@router.post(
    "/{document_id}/versions",
    response_model=DocumentVersionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new document version",
)
async def create_document_version(
    document_id: UUID,
    body: DocumentVersionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> DocumentVersionRead:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == current_user.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    new_version = doc.version + 1
    doc.version = new_version
    doc.file_url = body.file_url
    doc.status = DocumentStatus.DRAFT  # New version goes back to draft

    version = DocumentVersion(
        document_id=document_id,
        version=new_version,
        file_url=body.file_url,
        changes_summary=body.changes_summary,
        uploaded_by=current_user.id,
        created_by=str(current_user.id),
    )
    db.add(version)
    await db.flush()
    await db.refresh(version)
    return DocumentVersionRead.model_validate(version)


@router.get(
    "/{document_id}/versions",
    response_model=list[DocumentVersionRead],
    summary="List document version history",
)
async def list_document_versions(
    document_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[DocumentVersionRead]:
    result = await db.execute(
        select(DocumentVersion)
        .where(DocumentVersion.document_id == document_id)
        .order_by(DocumentVersion.version.desc())
    )
    versions = result.scalars().all()
    return [DocumentVersionRead.model_validate(v) for v in versions]


# ── Acknowledgments ───────────────────────────────────────────


@router.post(
    "/{document_id}/acknowledge",
    response_model=DocumentAcknowledgmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Acknowledge a document (mark as read)",
)
async def acknowledge_document(
    document_id: UUID,
    body: DocumentAcknowledgmentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> DocumentAcknowledgmentRead:
    # Check if already acknowledged
    existing = await db.execute(
        select(DocumentAcknowledgment).where(
            DocumentAcknowledgment.document_id == document_id,
            DocumentAcknowledgment.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document already acknowledged by this user",
        )

    ack = DocumentAcknowledgment(
        document_id=document_id,
        user_id=current_user.id,
        acknowledged_at=datetime.now(UTC),
        signature_url=body.signature_url,
        created_by=str(current_user.id),
    )
    db.add(ack)
    await db.flush()
    await db.refresh(ack)
    return DocumentAcknowledgmentRead.model_validate(ack)


@router.get(
    "/{document_id}/acknowledgments",
    response_model=list[DocumentAcknowledgmentRead],
    summary="List who acknowledged this document",
)
async def list_acknowledgments(
    document_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[DocumentAcknowledgmentRead]:
    result = await db.execute(
        select(DocumentAcknowledgment)
        .where(DocumentAcknowledgment.document_id == document_id)
        .order_by(DocumentAcknowledgment.acknowledged_at.desc())
    )
    acks = result.scalars().all()
    return [DocumentAcknowledgmentRead.model_validate(a) for a in acks]


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a document",
)
async def delete_document(
    document_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> None:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.organization_id == manager.organization_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    doc.is_deleted = True
    doc.updated_by = str(manager.id)
    await db.flush()
