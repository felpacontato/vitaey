# Vitaey Roadmap

## Phase 1 - Product Foundation

- Monorepo with frontend and backend.
- Candidate dashboard.
- Local job dataset and transparent matching.
- Manual-confirmation application modal.
- API contracts for jobs, profile, recommendations and applications.

## Phase 2 - Real Data Layer

- PostgreSQL schema and migrations.
- Auth with Google first.
- Resume upload storage.
- Parser worker for PDF/DOCX.
- Audit log for application confirmations.

## Phase 3 - AI Layer

- Embedding provider abstraction.
- Local fallback scoring.
- Resume tailoring prompts and versioning.
- Interview preparation assistant.

## Phase 4 - Integrations

- Official or authorized job-source adapters.
- LinkedIn only after approval and strict API terms review.
- Indeed/Glassdoor adapters through official or authorized data routes.
- Apify or similar only when provider and platform terms allow it.

## Phase 5 - Production Readiness

- Rate limits.
- Encryption for third-party tokens.
- Observability.
- Backups.
- E2E smoke tests.
- Deploy target confirmation.
