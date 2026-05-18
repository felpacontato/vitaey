# Vitaey Requirements

## Source

Briefing extracted from `C:\Users\feema\Downloads\Vitaey\Desenvolvimento do Vitaey.pdf`.

## Core Positioning

Vitaey helps candidates find better job opportunities faster while staying inside a safe compliance envelope.

The product must not behave like a high-volume auto-apply bot. It should support discovery, organization, document personalization and assisted application review.

## Main Capabilities

1. Job ingestion through official APIs or authorized providers.
2. Resume upload and parsing.
3. Candidate profile with skills, experience, education and preferences.
4. AI matching using embeddings or transparent scoring.
5. Ranked recommendations with reasons.
6. Resume and cover letter tailoring.
7. Assisted application workflow with required confirmation.
8. Application Kanban and status tracking.
9. Interview preparation and reminders.
10. Company, salary and networking insights.

## Compliance Constraints

- LinkedIn APIs require approval and explicit API terms adherence.
- Scraping, botting and unattended application sending are prohibited or high risk.
- Every application submission must be initiated by the user in real time.
- Rate limits, duplicate checks and uncertainty stops are mandatory.

## MVP Definition

The MVP should deliver:

- A candidate dashboard.
- Mock/offline job ingestion adapter.
- Profile and resume API contracts.
- Matching score with explainable reasons.
- Application Kanban.
- Confirmation modal that blocks sending until all required fields are reviewed.
- Adapter interfaces for future official integrations.
