from fastapi import APIRouter

from app.api import routes_applications, routes_jobs, routes_profile

api_router = APIRouter()
api_router.include_router(routes_profile.router, tags=["profile"])
api_router.include_router(routes_jobs.router, tags=["jobs"])
api_router.include_router(routes_applications.router, tags=["applications"])


@api_router.get("/compliance/policy", tags=["compliance"])
def compliance_policy() -> dict[str, object]:
    return {
        "category": "assistant_with_user_confirmation",
        "manual_confirmation_required": True,
        "forbidden": ["mass_scraping", "unattended_auto_apply", "simulated_human_activity"],
        "required_controls": ["duplicate_check", "daily_limit", "uncertainty_stop", "consent_audit"],
    }
