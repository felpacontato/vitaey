# Vitaey API Draft

Base path: `/api/v1`

## Health

`GET /health`

Returns API status.

## Profile

`GET /profile`

Returns candidate profile.

`PUT /profile`

Updates candidate preferences, skills and search filters.

## Resumes

`POST /resumes`

Uploads or registers a resume document for parsing.

`POST /resumes/{resume_id}/tailor`

Creates a tailored resume draft for a job.

## Jobs

`GET /jobs`

Lists normalized jobs with filters.

`GET /jobs/{job_id}`

Returns full job details.

## Recommendations

`GET /recommendations`

Returns ranked jobs with score and reasons.

## Applications

`GET /applications`

Returns tracked applications.

`POST /applications/prepare`

Creates a pending application package.

`POST /applications/{application_id}/confirm`

Submits only after explicit user confirmation.

## Compliance

`GET /compliance/policy`

Returns current guardrails for UI display and automated checks.
