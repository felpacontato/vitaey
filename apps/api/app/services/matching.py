from app.models.domain import CandidateProfile, JobListing, Recommendation


def score_job(profile: CandidateProfile, job: JobListing) -> Recommendation:
    profile_terms = {term.lower() for term in profile.skills + profile.target_roles}
    job_terms = {term.lower() for term in job.requirements + [job.title, job.description]}

    matched = sorted(term for term in profile_terms if any(term in item for item in job_terms))
    missing = sorted(req for req in job.requirements if req.lower() not in profile_terms)

    skill_score = min(65, len(matched) * 13)
    seniority_score = 15 if profile.seniority.lower() == job.seniority.lower() else 6
    location_score = 12 if job.work_model.value == "remote" or profile.location in job.location else 4
    salary_score = 8 if not job.salary_min or job.salary_min >= int(profile.preferences.get("salary_min", 0)) else 2
    score = min(99, skill_score + seniority_score + location_score + salary_score)

    reasons = [
        f"{len(matched)} competencias conectadas ao perfil",
        f"Modelo de trabalho: {job.work_model.value}",
        f"Senioridade da vaga: {job.seniority}",
    ]
    if job.salary_min:
        reasons.append(f"Faixa salarial inicial: R$ {job.salary_min:,}".replace(",", "."))

    return Recommendation(job=job, score=score, reasons=reasons, gaps=missing[:5])


def rank_jobs(profile: CandidateProfile, jobs: list[JobListing]) -> list[Recommendation]:
    return sorted((score_job(profile, job) for job in jobs), key=lambda item: item.score, reverse=True)
