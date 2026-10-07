"""Lógica compartida de puntuación (RF-015/RF-016/RF-018, §10 reglas 10/11/13):
recalcular `priorityScore` de una incidencia tras un like/follow/comentario, y
ajustar los `points` de un usuario en un municipio (otorgados al resolver,
revertidos si se marca "no resuelto").

Dos escrituras separadas (ADD atómico del contador, luego SET del derivado)
en vez de una transacción: a escala de piloto el riesgo de carrera entre
ambas llamadas es aceptable — ver nota en cada handler que las usa. Para
concurrencia real la mejora natural es `TransactWriteItems`.
"""
from decimal import Decimal

from lib.dynamo import incidents_table, users_table
from lib.priority import compute_priority_score, tier_multiplier_for_points


def get_author_points(user_id: str, municipality_id: str) -> float:
    item = users_table().get_item(Key={"PK": f"USER#{user_id}", "SK": f"MUNICIPALITY#{municipality_id}"}).get("Item")
    return float(item["points"]) if item else 0.0


def update_priority_score(
    incident_id: str,
    likes: int,
    watchers_count: int,
    comments_count: int,
    created_by: str,
    municipality_id: str,
) -> Decimal:
    multiplier = tier_multiplier_for_points(get_author_points(created_by, municipality_id))
    score = Decimal(str(compute_priority_score(likes, watchers_count, comments_count, multiplier)))
    incidents_table().update_item(
        Key={"PK": f"INCIDENT#{incident_id}", "SK": "METADATA"},
        UpdateExpression="SET priorityScore = :p",
        ExpressionAttributeValues={":p": score},
    )
    return score


def adjust_points(user_id: str, municipality_id: str, delta: float, author_name: str | None = None) -> Decimal:
    """Suma `delta` (puede ser negativo, para revertir) a los puntos del
    usuario en ese municipio, y mantiene en sync el GSI disperso de
    escalafón (GSI1PK/GSI1SK, ver infra/dynamodb.tf)."""
    key = {"PK": f"USER#{user_id}", "SK": f"MUNICIPALITY#{municipality_id}"}

    resp = users_table().update_item(
        Key=key,
        UpdateExpression="ADD points :d",
        ExpressionAttributeValues={":d": Decimal(str(delta))},
        ReturnValues="UPDATED_NEW",
    )
    new_points = resp["Attributes"]["points"]

    update_expr = "SET GSI1PK = :gpk, GSI1SK = :gsk"
    values = {":gpk": f"MUNICIPALITY#{municipality_id}#RANKING", ":gsk": new_points}
    if author_name is not None:
        update_expr += ", authorName = :name"
        values[":name"] = author_name

    users_table().update_item(Key=key, UpdateExpression=update_expr, ExpressionAttributeValues=values)
    return new_points
