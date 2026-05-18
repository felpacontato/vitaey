from app.core.config import settings
from app.models.domain import ComplianceDecision, JobListing, Recommendation


def evaluate_application_readiness(
    recommendation: Recommendation,
    job: JobListing,
    already_applied: bool,
    applications_today: int,
) -> ComplianceDecision:
    blocked: list[str] = []
    warnings: list[str] = []

    if already_applied:
        blocked.append("Candidatura duplicada para esta vaga.")
    if applications_today >= settings.max_daily_applications:
        blocked.append("Limite diario de candidaturas atingido.")
    if recommendation.score < settings.min_submit_score:
        blocked.append("Compatibilidade abaixo do minimo configurado.")
    if recommendation.gaps:
        warnings.append("Existem lacunas que devem ser revisadas antes do envio.")
    if job.source != "official_api" and job.source != "manual_demo":
        warnings.append("Fonte exige revisao de permissao antes de automacao.")

    return ComplianceDecision(
        can_submit=not blocked,
        requires_user_confirmation=True,
        blocked_reasons=blocked,
        warnings=warnings,
    )
