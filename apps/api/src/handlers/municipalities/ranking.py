"""GET /municipalities/{municipalityId}/ranking — escalafón (Bronce/Plata/Oro)
de los ciudadanos activos de ese municipio, por puntos (RF-018/CU-008).

Query sobre el GSI disperso `ranking-by-municipality` de la tabla "users"
(solo los ítems de puntos con actividad real llevan GSI1PK/GSI1SK, ver
infra/dynamodb.tf y lib/scoring.py) — barata y acotada, nunca un Scan.
"""
from boto3.dynamodb.conditions import Key

from lib.dynamo import users_table
from lib.priority import get_tier
from lib.response import error_response, json_response


def handler(event, context):
    municipality_id = (event.get("pathParameters") or {}).get("municipalityId")
    if not municipality_id:
        return error_response(400, "Missing municipalityId")

    resp = users_table().query(
        IndexName="ranking-by-municipality",
        KeyConditionExpression=Key("GSI1PK").eq(f"MUNICIPALITY#{municipality_id}#RANKING"),
        ScanIndexForward=False,
    )

    ranking = [
        {
            "userId": item["PK"].split("#", 1)[1],
            "name": item.get("authorName"),
            "points": item.get("points", 0),
            "tier": get_tier(float(item.get("points", 0))),
        }
        for item in resp.get("Items", [])
    ]
    return json_response(200, ranking)
