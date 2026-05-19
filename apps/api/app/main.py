from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="Vitaey API",
        version="0.1.0",
        description="AI-assisted and compliance-first job-search backend.",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "vitaey-api"}

    @app.get("/health/ready", tags=["health"])
    def readiness() -> dict[str, object]:
        return {
            "status": "ready",
            "checks": {
                "api": "ok",
                "database": "not_configured_for_demo",
                "queue": "not_configured_for_demo",
            },
        }

    return app


app = create_app()
