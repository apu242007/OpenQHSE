"""Training / LMS management endpoints."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession, ManagerUser, Pagination
from app.models.training import (
    CompetencyMatrix,
    EnrollmentStatus,
    TrainingAssessment,
    TrainingCourse,
    TrainingEnrollment,
)
from app.schemas.training import (
    CompetencyMatrixCreate,
    CompetencyMatrixRead,
    CompetencyMatrixUpdate,
    TrainingAssessmentCreate,
    TrainingAssessmentRead,
    TrainingCourseCreate,
    TrainingCourseList,
    TrainingCourseRead,
    TrainingCourseUpdate,
    TrainingEnrollmentCreate,
    TrainingEnrollmentList,
    TrainingEnrollmentRead,
    TrainingEnrollmentUpdate,
)

router = APIRouter(prefix="/training", tags=["Training"])


# ── Courses ───────────────────────────────────────────────────


@router.get(
    "/courses",
    response_model=list[TrainingCourseList],
    summary="List training courses",
)
async def list_courses(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    category: str | None = None,
    course_type: str | None = None,
    search: str | None = None,
) -> list[TrainingCourseList]:
    query = select(TrainingCourse).where(
        TrainingCourse.organization_id == current_user.organization_id,
        TrainingCourse.is_deleted == False,  # noqa: E712
    )
    if category:
        query = query.where(TrainingCourse.category == category)
    if course_type:
        query = query.where(TrainingCourse.course_type == course_type)
    if search:
        query = query.where(TrainingCourse.title.ilike(f"%{search}%"))

    result = await db.execute(
        query.order_by(TrainingCourse.created_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    courses = result.scalars().all()
    return [TrainingCourseList.model_validate(c) for c in courses]


@router.post(
    "/courses",
    response_model=TrainingCourseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a training course",
)
async def create_course(
    body: TrainingCourseCreate,
    db: DBSession,
    manager: ManagerUser,
) -> TrainingCourseRead:
    course = TrainingCourse(
        organization_id=manager.organization_id,
        title=body.title,
        description=body.description,
        category=body.category,
        course_type=body.course_type,
        duration_hours=body.duration_hours,
        content=body.content,
        passing_score=body.passing_score,
        validity_months=body.validity_months,
        certificate_template_url=body.certificate_template_url,
        is_mandatory=body.is_mandatory,
        applicable_roles=body.applicable_roles,
        created_by=str(manager.id),
    )
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return TrainingCourseRead.model_validate(course)


@router.get(
    "/courses/{course_id}",
    response_model=TrainingCourseRead,
    summary="Get course detail",
)
async def get_course(
    course_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> TrainingCourseRead:
    result = await db.execute(
        select(TrainingCourse).where(
            TrainingCourse.id == course_id,
            TrainingCourse.organization_id == current_user.organization_id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return TrainingCourseRead.model_validate(course)


@router.patch(
    "/courses/{course_id}",
    response_model=TrainingCourseRead,
    summary="Update a training course",
)
async def update_course(
    course_id: UUID,
    body: TrainingCourseUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> TrainingCourseRead:
    result = await db.execute(
        select(TrainingCourse).where(
            TrainingCourse.id == course_id,
            TrainingCourse.organization_id == manager.organization_id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    course.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(course)
    return TrainingCourseRead.model_validate(course)


@router.delete(
    "/courses/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a training course",
)
async def delete_course(
    course_id: UUID,
    db: DBSession,
    manager: ManagerUser,
) -> None:
    result = await db.execute(
        select(TrainingCourse).where(
            TrainingCourse.id == course_id,
            TrainingCourse.organization_id == manager.organization_id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course.is_deleted = True
    course.updated_by = str(manager.id)
    await db.flush()


# ── Enrollments ───────────────────────────────────────────────


@router.get(
    "/enrollments",
    response_model=list[TrainingEnrollmentList],
    summary="List training enrollments",
)
async def list_enrollments(
    db: DBSession,
    current_user: CurrentUser,
    pagination: Pagination,
    course_id: UUID | None = None,
    user_id: UUID | None = None,
    enrollment_status: str | None = None,
) -> list[TrainingEnrollmentList]:
    query = (
        select(TrainingEnrollment)
        .join(TrainingCourse)
        .where(
            TrainingCourse.organization_id == current_user.organization_id,
            TrainingEnrollment.is_deleted == False,  # noqa: E712
        )
    )
    if course_id:
        query = query.where(TrainingEnrollment.course_id == course_id)
    if user_id:
        query = query.where(TrainingEnrollment.user_id == user_id)
    if enrollment_status:
        query = query.where(TrainingEnrollment.status == enrollment_status)

    result = await db.execute(
        query.order_by(TrainingEnrollment.enrolled_at.desc()).offset(pagination.offset).limit(pagination.page_size)
    )
    enrollments = result.scalars().all()
    return [TrainingEnrollmentList.model_validate(e) for e in enrollments]


@router.post(
    "/courses/{course_id}/enroll",
    response_model=TrainingEnrollmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll a user in a course",
)
async def enroll_user(
    course_id: UUID,
    body: TrainingEnrollmentCreate,
    db: DBSession,
    manager: ManagerUser,
) -> TrainingEnrollmentRead:
    # Check course exists
    course_result = await db.execute(
        select(TrainingCourse).where(
            TrainingCourse.id == course_id,
            TrainingCourse.organization_id == manager.organization_id,
        )
    )
    if not course_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Prevent duplicate active enrollment
    existing = await db.execute(
        select(TrainingEnrollment).where(
            TrainingEnrollment.course_id == course_id,
            TrainingEnrollment.user_id == body.user_id,
            TrainingEnrollment.status.in_([EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS]),
            TrainingEnrollment.is_deleted == False,  # noqa: E712
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already has an active enrollment for this course",
        )

    enrollment = TrainingEnrollment(
        course_id=course_id,
        user_id=body.user_id,
        site_id=body.site_id,
        enrolled_at=body.enrolled_at or datetime.now(UTC),
        assigned_by=manager.id,
        created_by=str(manager.id),
    )
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return TrainingEnrollmentRead.model_validate(enrollment)


@router.post(
    "/courses/{course_id}/enroll-bulk",
    summary="Bulk enroll users by role or site",
    status_code=status.HTTP_200_OK,
)
async def bulk_enroll(
    course_id: UUID,
    db: DBSession,
    manager: ManagerUser,
    role: str | None = Query(None),
    site_id: UUID | None = Query(None),
) -> dict:  # type: ignore[type-arg]
    """Enroll all users matching a role and/or site_id in the course."""
    from sqlalchemy import select as sa_select

    from app.models.user import User

    if not role and not site_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least role or site_id",
        )

    course_result = await db.execute(
        select(TrainingCourse).where(
            TrainingCourse.id == course_id,
            TrainingCourse.organization_id == manager.organization_id,
        )
    )
    if not course_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    users_query = sa_select(User).where(
        User.organization_id == manager.organization_id,
        User.is_deleted == False,  # noqa: E712
    )
    if role:
        users_query = users_query.where(User.role == role)
    if site_id:
        users_query = users_query.where(User.site_ids.contains([str(site_id)]))

    users_result = await db.execute(users_query)
    users = users_result.scalars().all()

    enrolled_count = 0
    skipped_count = 0
    now = datetime.now(UTC)

    for user in users:
        existing = await db.execute(
            select(TrainingEnrollment).where(
                TrainingEnrollment.course_id == course_id,
                TrainingEnrollment.user_id == user.id,
                TrainingEnrollment.status.in_([EnrollmentStatus.ENROLLED, EnrollmentStatus.IN_PROGRESS]),
                TrainingEnrollment.is_deleted == False,  # noqa: E712
            )
        )
        if existing.scalar_one_or_none():
            skipped_count += 1
            continue

        enrollment = TrainingEnrollment(
            course_id=course_id,
            user_id=user.id,
            enrolled_at=now,
            assigned_by=manager.id,
            created_by=str(manager.id),
        )
        db.add(enrollment)
        enrolled_count += 1

    await db.flush()
    return {"enrolled": enrolled_count, "skipped": skipped_count}


@router.post(
    "/enrollments",
    response_model=TrainingEnrollmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an enrollment (direct)",
)
async def create_enrollment(
    body: TrainingEnrollmentCreate,
    db: DBSession,
    manager: ManagerUser,
) -> TrainingEnrollmentRead:
    enrollment = TrainingEnrollment(
        course_id=body.course_id,
        user_id=body.user_id,
        site_id=body.site_id,
        enrolled_at=body.enrolled_at or datetime.now(UTC),
        assigned_by=manager.id,
        created_by=str(manager.id),
    )
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return TrainingEnrollmentRead.model_validate(enrollment)


@router.post(
    "/enrollments/{enrollment_id}/complete",
    response_model=TrainingEnrollmentRead,
    summary="Mark an enrollment as completed with a score",
)
async def complete_enrollment(
    enrollment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
    score: float = Query(..., ge=0, le=100),
) -> TrainingEnrollmentRead:
    result = await db.execute(select(TrainingEnrollment).where(TrainingEnrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    # Fetch course to determine passing score and validity
    course_result = await db.execute(select(TrainingCourse).where(TrainingCourse.id == enrollment.course_id))
    course = course_result.scalar_one_or_none()

    now = datetime.now(UTC)
    enrollment.score = score
    enrollment.completed_at = now

    if course and score >= course.passing_score:
        enrollment.status = EnrollmentStatus.COMPLETED
        if course.validity_months:
            from datetime import timedelta

            enrollment.expiry_date = now + timedelta(days=course.validity_months * 30)
    else:
        enrollment.status = EnrollmentStatus.FAILED

    enrollment.updated_by = str(current_user.id)
    await db.flush()
    await db.refresh(enrollment)
    return TrainingEnrollmentRead.model_validate(enrollment)


@router.patch(
    "/enrollments/{enrollment_id}",
    response_model=TrainingEnrollmentRead,
    summary="Update enrollment status / score",
)
async def update_enrollment(
    enrollment_id: UUID,
    body: TrainingEnrollmentUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> TrainingEnrollmentRead:
    result = await db.execute(select(TrainingEnrollment).where(TrainingEnrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    update_data = body.model_dump(exclude_unset=True)
    new_status = update_data.get("status")
    if new_status == EnrollmentStatus.IN_PROGRESS and not enrollment.started_at:
        enrollment.started_at = datetime.now(UTC)
    elif new_status == EnrollmentStatus.COMPLETED:
        enrollment.completed_at = datetime.now(UTC)

    for field, value in update_data.items():
        setattr(enrollment, field, value)
    enrollment.updated_by = str(current_user.id)

    await db.flush()
    await db.refresh(enrollment)
    return TrainingEnrollmentRead.model_validate(enrollment)


# ── Assessments ───────────────────────────────────────────────


@router.get(
    "/assessments/{course_id}",
    response_model=list[TrainingAssessmentRead],
    summary="Get assessments for a course",
)
async def get_assessments(
    course_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[TrainingAssessmentRead]:
    result = await db.execute(select(TrainingAssessment).where(TrainingAssessment.course_id == course_id))
    assessments = result.scalars().all()
    return [TrainingAssessmentRead.model_validate(a) for a in assessments]


@router.post(
    "/assessments/{course_id}/submit",
    summary="Submit assessment answers and get score",
)
async def submit_assessment(
    course_id: UUID,
    answers: list[dict],  # type: ignore[type-arg]
    db: DBSession,
    current_user: CurrentUser,
    enrollment_id: UUID | None = Query(None),
) -> dict:  # type: ignore[type-arg]
    """Evaluate submitted answers against correct answers and return the score."""
    result = await db.execute(select(TrainingAssessment).where(TrainingAssessment.course_id == course_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    questions = assessment.questions if isinstance(assessment.questions, list) else []
    total_points = 0.0
    earned_points = 0.0
    results = []

    for q in questions:
        q_id = str(q.get("id", ""))
        points = float(q.get("points", 1))
        total_points += points

        # Find submitted answer for this question
        submitted = next((a for a in answers if str(a.get("question_id")) == q_id), None)
        if not submitted:
            results.append({"question_id": q_id, "correct": False, "points_earned": 0})
            continue

        # Check correctness
        options = q.get("options", [])
        correct_options = [o for o in options if o.get("is_correct")]
        submitted_text = str(submitted.get("answer", "")).lower()
        is_correct = any(submitted_text == str(o.get("text", "")).lower() for o in correct_options)

        if is_correct:
            earned_points += points
        results.append(
            {
                "question_id": q_id,
                "correct": is_correct,
                "points_earned": points if is_correct else 0,
            }
        )

    score_pct = (earned_points / total_points * 100) if total_points else 0.0

    # Auto-complete enrollment if enrollment_id provided
    if enrollment_id:
        enroll_result = await db.execute(select(TrainingEnrollment).where(TrainingEnrollment.id == enrollment_id))
        enrollment = enroll_result.scalar_one_or_none()
        if enrollment:
            course_result = await db.execute(select(TrainingCourse).where(TrainingCourse.id == course_id))
            course = course_result.scalar_one_or_none()
            now = datetime.now(UTC)
            enrollment.score = score_pct
            enrollment.attempts = (enrollment.attempts or 0) + 1
            enrollment.completed_at = now

            if course and score_pct >= course.passing_score:
                enrollment.status = EnrollmentStatus.COMPLETED
                if course.validity_months:
                    from datetime import timedelta

                    enrollment.expiry_date = now + timedelta(days=course.validity_months * 30)
            else:
                enrollment.status = EnrollmentStatus.FAILED
            enrollment.updated_by = str(current_user.id)
            await db.flush()

    return {
        "score": round(score_pct, 1),
        "passed": score_pct >= (questions[0].get("passing_score", 70) if questions else 70),
        "results": results,
        "total_points": total_points,
        "earned_points": earned_points,
    }


@router.post(
    "/courses/{course_id}/assessments",
    response_model=TrainingAssessmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an assessment for a course",
)
async def create_assessment(
    course_id: UUID,
    body: TrainingAssessmentCreate,
    db: DBSession,
    manager: ManagerUser,
) -> TrainingAssessmentRead:
    assessment = TrainingAssessment(
        course_id=course_id,
        questions=body.questions,
        created_by=str(manager.id),
    )
    db.add(assessment)
    await db.flush()
    await db.refresh(assessment)
    return TrainingAssessmentRead.model_validate(assessment)


@router.get(
    "/courses/{course_id}/assessments",
    response_model=list[TrainingAssessmentRead],
    summary="List assessments for a course",
)
async def list_assessments(
    course_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[TrainingAssessmentRead]:
    result = await db.execute(select(TrainingAssessment).where(TrainingAssessment.course_id == course_id))
    assessments = result.scalars().all()
    return [TrainingAssessmentRead.model_validate(a) for a in assessments]


# ── Certificates ──────────────────────────────────────────────


@router.get(
    "/certificates/{enrollment_id}",
    summary="Download PDF certificate for a completed enrollment",
)
async def download_certificate(
    enrollment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> Response:
    from app.services.training_service import generate_certificate

    pdf_bytes = await generate_certificate(enrollment_id, db)
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate not available — enrollment must be completed",
        )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="certificado_{enrollment_id}.pdf"',
        },
    )


# ── Compliance & Matrix ───────────────────────────────────────


@router.get(
    "/matrix",
    summary="Get competency matrix with completion data",
)
async def get_competency_matrix(
    db: DBSession,
    current_user: CurrentUser,
) -> dict:  # type: ignore[type-arg]
    from app.services.training_service import calculate_compliance_matrix

    return await calculate_compliance_matrix(current_user.organization_id, db)


@router.get(
    "/compliance",
    summary="Get training compliance summary by area/role",
)
async def get_compliance_summary(
    db: DBSession,
    current_user: CurrentUser,
) -> dict:  # type: ignore[type-arg]
    from app.services.training_service import calculate_compliance_matrix

    matrix_data = await calculate_compliance_matrix(current_user.organization_id, db)

    # Compute per-role compliance percentages
    role_compliance = []
    for role in matrix_data["roles"]:
        role_matrix = matrix_data["matrix"].get(role, {})
        if not role_matrix:
            continue
        cells = list(role_matrix.values())
        avg_pct = sum(c["pct"] for c in cells) / len(cells) if cells else 0.0
        role_compliance.append({"role": role, "compliance_pct": round(avg_pct, 1)})

    return {
        "overall_pct": matrix_data["overall_pct"],
        "by_role": role_compliance,
        "total_courses": len(matrix_data["courses"]),
    }


@router.get(
    "/expiring",
    summary="Get certifications expiring soon",
)
async def get_expiring_certifications(
    db: DBSession,
    current_user: CurrentUser,
    days: int = Query(30, ge=1, le=365),
) -> list[dict]:  # type: ignore[type-arg]
    from app.services.training_service import get_expiring_certifications as svc_expiring

    return await svc_expiring(current_user.organization_id, db, days=days)


# ── Competency Matrix CRUD ────────────────────────────────────


@router.get(
    "/competencies",
    response_model=list[CompetencyMatrixRead],
    summary="List competency requirements",
)
async def list_competencies(
    db: DBSession,
    current_user: CurrentUser,
) -> list[CompetencyMatrixRead]:
    result = await db.execute(
        select(CompetencyMatrix).where(
            CompetencyMatrix.organization_id == current_user.organization_id,
            CompetencyMatrix.is_deleted == False,  # noqa: E712
        )
    )
    matrices = result.scalars().all()
    return [CompetencyMatrixRead.model_validate(m) for m in matrices]


@router.post(
    "/competencies",
    response_model=CompetencyMatrixRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a competency matrix entry",
)
async def create_competency(
    body: CompetencyMatrixCreate,
    db: DBSession,
    manager: ManagerUser,
) -> CompetencyMatrixRead:
    matrix = CompetencyMatrix(
        organization_id=manager.organization_id,
        role=body.role,
        required_courses=body.required_courses,
        required_certifications=body.required_certifications,
        review_cycle_months=body.review_cycle_months,
        created_by=str(manager.id),
    )
    db.add(matrix)
    await db.flush()
    await db.refresh(matrix)
    return CompetencyMatrixRead.model_validate(matrix)


@router.patch(
    "/competencies/{matrix_id}",
    response_model=CompetencyMatrixRead,
    summary="Update a competency matrix entry",
)
async def update_competency(
    matrix_id: UUID,
    body: CompetencyMatrixUpdate,
    db: DBSession,
    manager: ManagerUser,
) -> CompetencyMatrixRead:
    result = await db.execute(
        select(CompetencyMatrix).where(
            CompetencyMatrix.id == matrix_id,
            CompetencyMatrix.organization_id == manager.organization_id,
        )
    )
    matrix = result.scalar_one_or_none()
    if not matrix:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency entry not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(matrix, field, value)
    matrix.updated_by = str(manager.id)

    await db.flush()
    await db.refresh(matrix)
    return CompetencyMatrixRead.model_validate(matrix)
