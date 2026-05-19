from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_and_readiness() -> None:
    assert client.get("/health").json()["status"] == "ok"
    ready = client.get("/health/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"


def test_jobs_filter_by_contract_salary_and_model() -> None:
    response = client.get(
        "/api/v1/jobs",
        params={"employment_type": "pj", "work_model": "remote", "min_salary": 15000},
    )
    assert response.status_code == 200
    jobs = response.json()
    assert [job["id"] for job in jobs] == ["job_003"]


def test_prepare_creates_trackable_application_and_confirm_requires_review() -> None:
    prepared = client.post("/api/v1/applications/prepare", json={"job_id": "job_003"})
    assert prepared.status_code == 200
    app_id = prepared.json()["application"]["id"]

    blocked = client.post(
        f"/api/v1/applications/{app_id}/confirm",
        json={"user_confirmed": True, "reviewed_fields": ["profile"]},
    )
    assert blocked.status_code == 422

    confirmed = client.post(
        f"/api/v1/applications/{app_id}/confirm",
        json={
            "user_confirmed": True,
            "reviewed_fields": ["profile", "resume", "answers", "compliance"],
        },
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["application"]["stage"] == "applied"
