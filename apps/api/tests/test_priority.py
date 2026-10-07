from lib.priority import TIER_MULTIPLIERS, compute_priority_score, get_tier


def test_compute_priority_score_base():
    assert compute_priority_score(likes=10, watchers_count=4, comments_count=2) == 10 * 1 + 4 * 1.5 + 2 * 2


def test_compute_priority_score_with_tier_multiplier():
    score = compute_priority_score(
        likes=10, watchers_count=4, comments_count=2, tier_multiplier=TIER_MULTIPLIERS["gold"]
    )
    assert score == (10 * 1 + 4 * 1.5 + 2 * 2) * 1.5


def test_get_tier_thresholds():
    assert get_tier(0) == "bronze"
    assert get_tier(49) == "bronze"
    assert get_tier(50) == "silver"
    assert get_tier(199) == "silver"
    assert get_tier(200) == "gold"
