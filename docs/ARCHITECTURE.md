# Vitaey Architecture

## Services

Vitaey is structured as a modular monorepo.

- `apps/web`: React/Vite product UI.
- `apps/api`: FastAPI backend.
- Future `worker`: Celery workers for parsing, ingestion, notifications and AI jobs.

## Backend Modules

- API routers expose stable HTTP contracts.
- Schemas validate request and response bodies.
- Models describe database entities.
- Services own business rules.
- Adapters isolate external platforms and providers.

## Data Model

Initial entities:

- User
- CandidateProfile
- ResumeDocument
- JobListing
- Recommendation
- Application
- ApplicationEvent
- IntegrationAccount
- ConsentAudit

## AI Flow

1. Parse resume into structured profile.
2. Normalize job descriptions.
3. Generate text features or embeddings.
4. Compute compatibility score.
5. Return reasons and missing gaps.
6. Generate tailored document drafts only after user request.

## Guardrail Flow

Before application submit:

1. Check duplicate application.
2. Check daily limit.
3. Check confidence and required fields.
4. Require explicit user confirmation.
5. Log consent/audit record.

If any check fails, the system returns an actionable pending state rather than submitting.
