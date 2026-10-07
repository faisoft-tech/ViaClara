"""Réplica de getPriorityScore (src/data/incidents.ts) y del multiplicador de
escalafón (RF-018/§10 regla 13), para que el cálculo del backend coincida con
el que ya conoce el frontend.

priorityScore = (likes·1 + watchersCount·1.5 + comments·2) × tierMultiplier(autor, municipio)
"""

TIER_MULTIPLIERS = {
    "bronze": 1.0,
    "silver": 1.25,
    "gold": 1.5,
}

TIER_THRESHOLDS = {
    "bronze": 0,
    "silver": 50,
    "gold": 200,
}


def compute_priority_score(
    likes: int,
    watchers_count: int,
    comments_count: int,
    tier_multiplier: float = 1.0,
) -> float:
    base = likes * 1 + watchers_count * 1.5 + comments_count * 2
    return base * tier_multiplier


def get_tier(points: float) -> str:
    if points >= TIER_THRESHOLDS["gold"]:
        return "gold"
    if points >= TIER_THRESHOLDS["silver"]:
        return "silver"
    return "bronze"


def tier_multiplier_for_points(points: float) -> float:
    return TIER_MULTIPLIERS[get_tier(points)]
