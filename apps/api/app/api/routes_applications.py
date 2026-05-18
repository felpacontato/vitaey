from fastapi import APIRouter, HTTPException

from app.core.http import find_or_404
from app.models.domain import ApplicationRecord, ApplicationStage
from app.schemas.requests import ConfirmApplicationRequest, PrepareApplicationRequest
from app.services.compliance import evaluate_application_readiness
from app.services.documents import build_tailored_summary
from app.services.matching import score_job
from app.services.sample_data import applications, candidate, jobs

router = APIRouter(prefix="/applications")


@router.get("", response_model=list[ApplicationRecord])
def list_applications() -> list[ApplicationRecord]:
    return applications


@router.post("/prepare")
def prepare_application(payload: PrepareApplicationRequest) -> dict[str, object]:
    job = find_or_404(jobs, payload.job_id)
    recommendation = score_job(candidate, job)
    already_applied = any(app.job_id == job.id and app.stage != ApplicationStage.closed for app in applications)
    decision = evaluate_application_readiness(
        recommendation=recommendation,
        job=job,
        already_applied=already_applied,
        applications_today=0,
    )
    return {
        "job": job,
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
    return {
        "status": "ready_for_user_initiated_submit",
        "application": app.model_copy(update={"stage": ApplicationStage.applied}),
        "audit": {
            "user_confirmed": True,
            "reviewed_fields": payload.reviewed_fields,
            "message": "Submission may proceed only from an active user action.",
        },
    }
