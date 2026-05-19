from fastapi import APIRouter, Query

from app.core.http import find_or_404
from app.models.domain import EmploymentType, JobListing, Recommendation, WorkModel
from app.services.matching import rank_jobs
from app.services.sample_data import candidate, jobs

router = APIRouter()


@router.get("/jobs", response_model=list[JobListing])
def list_jobs(
    keyword: str | None = None,
    location: str | None = None,
    work_model: WorkModel | None = None,
    employment_type: EmploymentType | None = None,
    seniority: str | None = None,
    min_salary: int | None = Query(default=None, ge=0),
) -> list[JobListing]:
    filtered = jobs
    if keyword:
        needle = keyword.lower()
        filtered = [job for job in filtered if needle in f"{job.title} {job.company} {job.description}".lower()]
    if location:
        filtered = [job for job in filtered if location.lower() in job.location.lower()]
    if work_model:
        filtered = [job for job in filtered if job.work_model == work_model]
    if employment_type:
        filtered = [job for job in filtered if job.employment_type == employment_type]
    if seniority:
        filtered = [job for job in filtered if seniority.lower() == job.seniority.lower()]
    if min_salary:
        filtered = [job for job in filtered if (job.salary_max or 0) >= min_salary]
    return filtered


@router.get("/jobs/{job_id}", response_model=JobListing)
def get_job(job_id: str) -> JobListing:
    return find_or_404(jobs, job_id)


@router.get("/recommendations", response_model=list[Recommendation])
def recommendations() -> list[Recommendation]:
    return rank_jobs(candidate, jobs)
