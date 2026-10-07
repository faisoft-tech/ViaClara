"""GET /incidents/{id} — detalle completo de una incidencia, con sus
comentarios, en una sola Query (patrón adjacency-list: todo vive bajo
PK=INCIDENT#<id>, ver infra/dynamodb.tf).
"""
from boto3.dynamodb.conditions import Key

from lib.dynamo import incidents_table
from lib.response import error_response, json_response

_GSI_KEYS = ("GSI1PK", "GSI1SK")


def handler(event, context):
    incident_id = (event.get("pathParameters") or {}).get("id")
    if not incident_id:
        return error_response(400, "Missing incident id")

    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    current_user_id = claims.get("sub")

    resp = incidents_table().query(KeyConditionExpression=Key("PK").eq(f"INCIDENT#{incident_id}"))
    items = resp.get("Items", [])

    metadata = next((i for i in items if i["SK"] == "METADATA"), None)
    if metadata is None:
        return error_response(404, "Incident not found")

    comments = [i for i in items if i["SK"].startswith("COMMENT#")]
    like_sks = {i["SK"] for i in items if i["SK"].startswith("LIKE#") and not i["SK"].startswith("LIKE#COMMENT#")}
    comment_like_sks = {i["SK"] for i in items if i["SK"].startswith("LIKE#COMMENT#")}

    result = {k: v for k, v in metadata.items() if k not in _GSI_KEYS and k not in ("PK", "SK")}
    result["liked"] = current_user_id is not None and f"LIKE#{current_user_id}" in like_sks
    result["comments"] = [
        {
            "id": c["SK"].split("#")[-1],
            "author": c.get("author"),
            "text": c.get("text"),
            "date": c.get("date"),
            "isMunicipality": c.get("isMunicipality", False),
            "likes": c.get("likes", 0),
            "likedByMe": (
                current_user_id is not None
                and f"LIKE#COMMENT#{c['SK'].split('#')[-1]}#{current_user_id}" in comment_like_sks
            ),
        }
        for c in comments
    ]

    return json_response(200, result)
