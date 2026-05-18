from app.services.matching import rank_jobs
from app.services.sample_data import candidate, jobs


def test_recommendations_are_ranked_by_score() -> None:
    ranked = rank_jobs(candidate, jobs)
    assert ranked
    assert ranked[0].score >= ranked[-1].score
    assert ranked[0].reasons
