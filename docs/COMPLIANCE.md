# Vitaey Compliance Model

## Safe Category

Vitaey targets the safer "AI drafting assistant" category:

- It recommends and drafts.
- It pre-fills only when allowed.
- It requires user review.
- It never submits while the user is offline.

## Forbidden Behaviors

- Mass scraping of platforms.
- Simulated human activity.
- Bulk applications without review.
- Collecting profile or job data without permission.
- Storing third-party credentials without encryption.

## Required Product Controls

- Manual confirmation before every application.
- Daily application limit.
- Duplicate company/job detection.
- Uncertainty stop when the fit score or required fields are insufficient.
- Clear consent copy in the application modal.
- Audit trail for submissions and integration actions.

## Adapter Policy

Each integration adapter must declare:

- Provider name.
- Data source type: official API, authorized partner, manual import or user-provided URL.
- Allowed operations.
- Forbidden operations.
- Rate limits.
- Consent requirements.
