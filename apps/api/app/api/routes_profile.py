from fastapi import APIRouter

from app.models.domain import CandidateProfile
from app.schemas.requests import ProfileUpdate
from app.services.sample_data import candidate

router = APIRouter(prefix="/profile")


@router.get("", response_model=CandidateProfile)
def get_profile() -> CandidateProfile:
    return candidate


@router.put("", response_model=CandidateProfile)
def update_profile(payload: ProfileUpdate) -> CandidateProfile:
    data = candidate.model_dump()
    updates = payload.model_dump(exclude_unset=True)
    data.update(updates)
    return CandidateProfile(**data)
