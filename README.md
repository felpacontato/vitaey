# Vitaey

Vitaey is an AI-assisted job-search platform for Brazilian professionals.
It aggregates job opportunities, ranks them against a candidate profile, helps tailor resumes and cover letters, and tracks applications through a compliant, user-confirmed workflow.

## Product Rule

Vitaey is an assistant, not an autonomous auto-apply bot.

- The user must explicitly confirm every application submission.
- Discovery and organization are low risk.
- Assisted autofill is allowed only with user review.
- Bulk scraping, account automation, and unattended applications are out of scope.

## Workspace

- Frontend: `apps/web`
- Backend API: `apps/api`
- Docs: `docs`
- Project agent: `agente_projeto.md`

## First Local Run

Backend:

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8010
```

Frontend:

```bash
cd apps/web
pnpm install
pnpm run dev
```

## Current Scope

This first version creates the product foundation:

- AI job matching contract and local scoring service
- Resume/profile extraction API contract
- Job recommendation API contract
- Application tracking and confirmation guardrails
- Responsive Portuguese UI for dashboard, filters, details, resume assistant and Kanban

Production integrations with LinkedIn, Indeed, Glassdoor, Apify, OAuth providers, LLM APIs, PostgreSQL and Redis are designed as adapters and intentionally not hardcoded.
