from fastapi import APIRouter

from app.core.http import find_or_404
from app.models.domain import JobListing, Recommendation
from app.schemas.requests import JobFilters
from app.services.matching import rank_jobs
from app.services.sample_data import candidate, jobs

router = APIRouter()


@router.get("/jobs", response_model=list[JobListing])
def list_jobs(filters: JobFilters = JobFilters()) -> list[JobListing]:
    filtered = jobs
    if filters.keyword:
        needle = filters.keyword.lower()
        filtered = [job for job in filtered if needle in f"{job.title} {job.company} {job.description}".lower()]
    if filters.location:
        filtered = [job for job in filtered if filters.location.lower() in job.location.lower()]
    if filters.work_model:
        filtered = [job for job in filtered if job.work_model == filters.work_model]
    if filters.employment_type:
        filtered = [job for job in filtered if job.employment_type == filters.employment_type]
    if filters.seniority:
        filtered = [job for job in filtered if filters.seniority.lower() == job.seniority.lower()]
    if filters.min_salary:
        filtered = [job for job in filtered if (job.salary_max or 0) >= filters.min_salary]
    return filtered


@router.get("/jobs/{job_id}", response_model=JobListing)
def get_job(job_id: str) -> JobListing:
    return find_or_404(jobs, job_id)


@router.get("/recommendations", response_model=list[Recommendation])
def recommendations() -> list[Recommendation]:
    return rank_jobs(candidate, jobs)
