"""Form template and submission management endpoints."""

from __future__ import annotations

import copy
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.form import (
    FormAttachment,
    FormStatus,
    FormSubmission,
    FormTemplate,
    SubmissionStatus,
)
from app.schemas.form import (
    FormAttachmentCreate,
    FormAttachmentRead,
    FormSubmissionCreate,
    FormSubmissionList,
    FormSubmissionRead,
    FormSubmissionUpdate,
    FormTemplateCreate,
    FormTemplateList,
    FormTemplateRead,
    FormTemplateUpdate,
)
from app.services.form_service import (
    calculate_score,
    generate_pdf_report,
    validate_submission,
)

router = APIRouter(prefix="/forms", tags=["Forms"])


# ── Templates ─────────────────────────────────────────────────


@router.get(
    "/templates",
    response_model=list[FormTemplateList],
    summary="List form templates",
)
async def list_templates(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    category: str | None = None,
) -> list[FormTemplateList]:
    query = select(FormTemplate).where(
        (FormTemplate.organization_id == current_user.organization_id)
        | (FormTemplate.is_global == True),  # noqa: E712
        FormTemplate.is_deleted == False,  # noqa: E712
    )
    if category:
        query = query.where(FormTemplate.category == category)
    result = await db.execute(
        query.order_by(FormTemplate.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    templates = result.scalars().all()
    return [FormTemplateList.model_validate(t) for t in templates]


@router.post(
    "/templates",
    response_model=FormTemplateRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a form template",
)
async def create_template(
    body: FormTemplateCreate,
    db: DBSession,
    manager: ManagerUser,
) -> FormTemplateRead:
    template = FormTemplate(
        name=body.name,
        description=body.description,
        category=body.category,
        is_global=body.is_global,
        tags=body.tags,
        schema=body.schema_def,
        scoring_config=body.scoring_config.model_dump() if body.scoring_config else None,
        organization_id=manager.organization_id,
        site_id=body.site_id,
        created_by=str(manager.id),
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return FormTemplateRead.model_validate(template)


@router.get(
    "/templates/{template_id}",
    response_model=FormTemplateRead,
    summary="Get a form template by ID",
)
async def get_template(
    template_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> FormTemplateRead:
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            (FormTemplate.organization_id == current_user.organization_id)
            | (FormTemplate.is_global == True),  # noqa: E712
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return FormTemplateRead.model_validate(template)


@router.patch(
    "/templates/{template_id}",
    response_model=FormTemplateRead,
    summary="Update a form template",
)
async def update_template(
    template_id: UUID,
    body: FormTemplateUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> FormTemplateRead:
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            FormTemplate.organization_id == manager.organization_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    update_data = body.model_dump(exclude_unset=True)
    if "schema_def" in update_data and update_data["schema_def"] is not None:
        update_data["schema"] = update_data.pop("schema_def")
        template.version += 1
    else:
        update_data.pop("schema_def", None)

    if "scoring_config" in update_data and update_data["scoring_config"] is not None:
        update_data["scoring_config"] = body.scoring_config.model_dump()  # type: ignore[union-attr]

    for field, value in update_data.items():
        setattr(template, field, value)
    template.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(template)
    return FormTemplateRead.model_validate(template)


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a form template",
)
async def delete_template(
    template_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> Response:
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            FormTemplate.organization_id == manager.organization_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_deleted = True
    template.deleted_at = datetime.now(UTC)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/templates/{template_id}/publish",
    response_model=FormTemplateRead,
    summary="Publish a form template",
)
async def publish_template(
    template_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> FormTemplateRead:
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            FormTemplate.organization_id == manager.organization_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.status == FormStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Already published")
    template.status = FormStatus.PUBLISHED
    template.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(template)
    return FormTemplateRead.model_validate(template)


@router.post(
    "/templates/{template_id}/archive",
    response_model=FormTemplateRead,
    summary="Archive a form template",
)
async def archive_template(
    template_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> FormTemplateRead:
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            FormTemplate.organization_id == manager.organization_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.status = FormStatus.ARCHIVED
    template.updated_by = str(manager.id)
    await db.flush()
    await db.refresh(template)
    return FormTemplateRead.model_validate(template)


@router.post(
    "/templates/{template_id}/duplicate",
    response_model=FormTemplateRead,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate a form template",
)
async def duplicate_template(
    template_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> FormTemplateRead:
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            (FormTemplate.organization_id == manager.organization_id)
            | (FormTemplate.is_global == True),  # noqa: E712
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Template not found")

    clone = FormTemplate(
        name=f"{original.name} (copia)",
        description=original.description,
        category=original.category,
        is_global=False,
        tags=list(original.tags) if original.tags else None,
        schema=copy.deepcopy(original.schema),
        scoring_config=copy.deepcopy(original.scoring_config) if original.scoring_config else None,
        organization_id=manager.organization_id,
        site_id=original.site_id,
        status=FormStatus.DRAFT,
        version=1,
        created_by=str(manager.id),
    )
    db.add(clone)
    await db.flush()
    await db.refresh(clone)
    return FormTemplateRead.model_validate(clone)


@router.get(
    "/templates/{template_id}/versions",
    response_model=list[dict],
    summary="Get version history of a template",
)
async def get_template_versions(
    template_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[dict]:
    """Returns current version info (full history requires audit log)."""
    result = await db.execute(
        select(FormTemplate).where(
            FormTemplate.id == template_id,
            (FormTemplate.organization_id == current_user.organization_id)
            | (FormTemplate.is_global == True),  # noqa: E712
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return [
        {
            "version": template.version,
            "status": template.status,
            "updated_at": template.updated_at.isoformat() if template.updated_at else None,
            "updated_by": template.updated_by,
        }
    ]


# ── Submissions ───────────────────────────────────────────────


@router.get(
    "/submissions",
    response_model=list[FormSubmissionList],
    summary="List form submissions",
)
async def list_submissions(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    template_id: UUID | None = None,
    site_id: UUID | None = None,
) -> list[FormSubmissionList]:
    query = select(FormSubmission).where(
        FormSubmission.organization_id == current_user.organization_id,
        FormSubmission.is_deleted == False,  # noqa: E712
    )
    if template_id:
        query = query.where(FormSubmission.template_id == template_id)
    if site_id:
        query = query.where(FormSubmission.site_id == site_id)
    result = await db.execute(
        query.order_by(FormSubmission.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.page_size)
    )
    submissions = result.scalars().all()
    return [FormSubmissionList.model_validate(s) for s in submissions]


@router.post(
    "/submissions",
    response_model=FormSubmissionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a form",
)
async def create_submission(
    body: FormSubmissionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> FormSubmissionRead:
    # Load template for scoring
    tpl_result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == body.template_id)
    )
    template = tpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Validate submission data
    errors = validate_submission(template.schema, body.data)
    if errors:
        raise HTTPException(status_code=422, detail={"validation_errors": errors})

    # Calculate score
    score_result = calculate_score(
        template.schema, body.data, template.scoring_config
    )

    submission = FormSubmission(
        template_id=body.template_id,
        organization_id=current_user.organization_id,
        site_id=body.site_id,
        submitted_by=current_user.id,
        data=body.data,
        score=score_result["score"],
        max_score=score_result["max_score"],
        percentage=score_result["percentage"],
        gps_latitude=body.gps_latitude,
        gps_longitude=body.gps_longitude,
        device_info=body.device_info,
        offline_id=body.offline_id,
        status=SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now(UTC),
        created_by=str(current_user.id),
    )
    db.add(submission)
    await db.flush()
    await db.refresh(submission)
    return FormSubmissionRead.model_validate(submission)


@router.get(
    "/submissions/{submission_id}",
    response_model=FormSubmissionRead,
    summary="Get a form submission by ID",
)
async def get_submission(
    submission_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> FormSubmissionRead:
    result = await db.execute(
        select(FormSubmission).where(
            FormSubmission.id == submission_id,
            FormSubmission.organization_id == current_user.organization_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return FormSubmissionRead.model_validate(submission)


@router.patch(
    "/submissions/{submission_id}",
    response_model=FormSubmissionRead,
    summary="Update a form submission",
)
async def update_submission(
    submission_id: UUID,
    body: FormSubmissionUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> FormSubmissionRead:
    result = await db.execute(
        select(FormSubmission).where(
            FormSubmission.id == submission_id,
            FormSubmission.organization_id == current_user.organization_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(submission, field, value)
    submission.updated_by = str(current_user.id)

    await db.flush()
    await db.refresh(submission)
    return FormSubmissionRead.model_validate(submission)


# ── Attachments ───────────────────────────────────────────────


@router.post(
    "/submissions/{submission_id}/attachments",
    response_model=FormAttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add an attachment to a form submission",
)
async def create_attachment(
    submission_id: UUID,
    body: FormAttachmentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> FormAttachmentRead:
    attachment = FormAttachment(
        submission_id=submission_id,
        field_key=body.field_key,
        file_url=body.file_url,
        file_type=body.file_type,
        file_size=body.file_size,
        created_by=str(current_user.id),
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    return FormAttachmentRead.model_validate(attachment)


@router.delete(
    "/submissions/{submission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a form submission",
)
async def delete_submission(
    submission_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Response:
    result = await db.execute(
        select(FormSubmission).where(
            FormSubmission.id == submission_id,
            FormSubmission.organization_id == current_user.organization_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    submission.is_deleted = True
    submission.deleted_at = datetime.now(UTC)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/submissions/{submission_id}/report",
    summary="Download PDF report for a submission",
)
async def submission_pdf_report(
    submission_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Response:
    result = await db.execute(
        select(FormSubmission).where(
            FormSubmission.id == submission_id,
            FormSubmission.organization_id == current_user.organization_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    tpl_result = await db.execute(
        select(FormTemplate).where(FormTemplate.id == submission.template_id)
    )
    template = tpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    score_result = calculate_score(
        template.schema, submission.data, template.scoring_config
    )
    pdf_bytes = generate_pdf_report(
        template_data={"name": template.name, "schema": template.schema, "scoring_config": template.scoring_config},
        submission_data={
            "submitted_by_name": str(submission.submitted_by),
            "submitted_at": submission.submitted_at,
            "site_name": str(submission.site_id),
            "status": submission.status,
        },
        answers=submission.data,
        score_result=score_result,
    )
    filename = f"openqhse_form_{submission_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Offline Sync ──────────────────────────────────────────────


@router.post(
    "/sync",
    response_model=list[FormSubmissionRead],
    summary="Batch sync offline submissions",
)
async def sync_submissions(
    body: list[FormSubmissionCreate],
    db: DBSession,
    current_user: CurrentUser,
) -> list[FormSubmissionRead]:
    """Accept an array of submissions from mobile/offline clients.
    Deduplicates on offline_id.
    """
    results: list[FormSubmissionRead] = []
    for item in body:
        # Check for duplicate
        if item.offline_id:
            dup = await db.execute(
                select(FormSubmission).where(
                    FormSubmission.offline_id == item.offline_id,
                    FormSubmission.organization_id == current_user.organization_id,
                )
            )
            if dup.scalar_one_or_none():
                continue

        # Load template for scoring
        tpl_result = await db.execute(
            select(FormTemplate).where(FormTemplate.id == item.template_id)
        )
        template = tpl_result.scalar_one_or_none()
        score_result = {"score": 0, "max_score": 0, "percentage": 0}
        if template:
            score_result = calculate_score(
                template.schema, item.data, template.scoring_config
            )

        submission = FormSubmission(
            template_id=item.template_id,
            organization_id=current_user.organization_id,
            site_id=item.site_id,
            submitted_by=current_user.id,
            data=item.data,
            score=score_result["score"],
            max_score=score_result["max_score"],
            percentage=score_result["percentage"],
            gps_latitude=item.gps_latitude,
            gps_longitude=item.gps_longitude,
            device_info=item.device_info,
            offline_id=item.offline_id,
            status=SubmissionStatus.SYNCED,
            submitted_at=datetime.now(UTC),
            created_by=str(current_user.id),
        )
        db.add(submission)
        await db.flush()
        await db.refresh(submission)
        results.append(FormSubmissionRead.model_validate(submission))

    return results
