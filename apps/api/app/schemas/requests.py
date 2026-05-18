from pydantic import BaseModel, Field

from app.models.domain import EmploymentType, WorkModel


class JobFilters(BaseModel):
    keyword: str | None = None
    location: str | None = None
    work_model: WorkModel | None = None
    employment_type: EmploymentType | None = None
    seniority: str | None = None
    min_salary: int | None = Field(default=None, ge=0)


class ProfileUpdate(BaseModel):
    headline: str | None = None
    location: str | None = None
    seniority: str | None = None
    target_roles: list[str] | None = None
    skills: list[str] | None = None
    languages: list[str] | None = None
    preferences: dict[str, str | int | bool] | None = None


class PrepareApplicationRequest(BaseModel):
    job_id: str
    resume_id: str | None = None
    cover_letter_text: str | None = None


class ConfirmApplicationRequest(BaseModel):
    user_confirmed: bool
    reviewed_fields: list[str] = Field(default_factory=list)
    answers: dict[str, str] = Field(default_factory=dict)
