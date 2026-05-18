from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class WorkModel(StrEnum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"


class EmploymentType(StrEnum):
    clt = "clt"
    pj = "pj"
    contract = "contract"
    internship = "internship"


class ApplicationStage(StrEnum):
    saved = "saved"
    prepared = "prepared"
    applied = "applied"
    interviewing = "interviewing"
    offered = "offered"
    closed = "closed"


class CandidateProfile(BaseModel):
    id: str
    full_name: str
    headline: str
    location: str
    seniority: str
    target_roles: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    preferences: dict[str, Any] = Field(default_factory=dict)


class JobListing(BaseModel):
    id: str
    title: str
    company: str
    location: str
    work_model: WorkModel
    employment_type: EmploymentType
    seniority: str
    salary_min: int | None = None
    salary_max: int | None = None
    source: str
    source_url: HttpUrl | None = None
    description: str
    requirements: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    posted_days_ago: int = 0


class Recommendation(BaseModel):
    job: JobListing
    score: int
    reasons: list[str]
    gaps: list[str]


class ApplicationRecord(BaseModel):
    id: str
    job_id: str
    stage: ApplicationStage
    company: str
    title: str
    sent_at: str | None = None
    notes: str | None = None
    tags: list[str] = Field(default_factory=list)


class ComplianceDecision(BaseModel):
    can_submit: bool
    requires_user_confirmation: bool = True
    blocked_reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
