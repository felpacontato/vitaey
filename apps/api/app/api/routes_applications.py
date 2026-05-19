from datetime import date

from fastapi import APIRouter, HTTPException

from app.core.http import find_or_404
from app.models.domain import ApplicationRecord, ApplicationStage
from app.schemas.requests import ConfirmApplicationRequest, PrepareApplicationRequest
from app.services.compliance import evaluate_application_readiness
from app.services.documents import build_tailored_summary
from app.services.matching import score_job
from app.services.sample_data import applications, candidate, jobs

router = APIRouter(prefix="/applications")
APPLICATION_TAGS_BY_MODEL = {"remote": "remoto", "hybrid": "hibrido", "onsite": "presencial"}


@router.get("", response_model=list[ApplicationRecord])
def list_applications() -> list[ApplicationRecord]:
    return applications


@router.post("/prepare")
def prepare_application(payload: PrepareApplicationRequest) -> dict[str, object]:
    job = find_or_404(jobs, payload.job_id)
    recommendation = score_job(candidate, job)
    application = next((app for app in applications if app.job_id == job.id), None)
    already_applied = application is not None and application.stage != ApplicationStage.closed
    decision = evaluate_application_readiness(
        recommendation=recommendation,
        job=job,
        already_applied=already_applied,
        applications_today=0,
    )
    if application is None:
        application = ApplicationRecord(
            id=f"app_{job.id}",
            job_id=job.id,
            stage=ApplicationStage.prepared,
            company=job.company,
            title=job.title,
            tags=[f"{recommendation.score}% match", APPLICATION_TAGS_BY_MODEL[job.work_model.value]],
        )
        applications.append(application)
    return {
        "job": job,
        "application": application,
        "recommendation": recommendation,
        "decision": decision,
        "document_draft": build_tailored_summary(candidate, job),
        "next_step": "review_required",
    }


@router.post("/{application_id}/confirm")
def confirm_application(application_id: str, payload: ConfirmApplicationRequest) -> dict[str, object]:
    if not payload.user_confirmed:
        raise HTTPException(status_code=409, detail="User confirmation is required.")
    required = {"profile", "resume", "answers", "compliance"}
    missing = sorted(required.difference(payload.reviewed_fields))
    if missing:
        raise HTTPException(status_code=422, detail={"missing_reviewed_fields": missing})
    app = find_or_404(applications, application_id)
    updated = app.model_copy(update={"stage": ApplicationStage.applied, "sent_at": date.today().isoformat()})
    app_index = applications.index(app)
    applications[app_index] = updated
    return {
        "status": "ready_for_user_initiated_submit",
        "application": updated,
        "audit": {
            "user_confirmed": True,
            "reviewed_fields": payload.reviewed_fields,
            "message": "Submission may proceed only from an active user action.",
        },
    }
