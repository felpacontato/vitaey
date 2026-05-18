from app.models.domain import CandidateProfile, JobListing


def build_tailored_summary(profile: CandidateProfile, job: JobListing) -> dict[str, object]:
    matched_skills = [
        skill for skill in profile.skills if any(skill.lower() in req.lower() for req in job.requirements)
    ]
    headline = f"{profile.full_name} - {job.title}"
    cover_letter = (
        f"Ola, time {job.company}. Tenho experiencia alinhada a {', '.join(matched_skills[:4])} "
        f"e interesse na oportunidade de {job.title}. Posso contribuir com descoberta, execucao "
        "e melhoria continua mantendo foco em resultado e colaboracao."
    )
    bullets = [
        f"Experiencia aplicada em {skill} para desafios similares aos da vaga."
        for skill in matched_skills[:5]
    ]
    return {"headline": headline, "matched_skills": matched_skills, "bullets": bullets, "cover_letter": cover_letter}
