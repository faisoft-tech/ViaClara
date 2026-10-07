"""POST /incidents/{id}/comments — añadir un comentario. Requiere JWT (§10
regla 6). `isMunicipality` se marca automáticamente según el rol del autor
(operario/administrador — §13 "Comentar como Ayuntamiento").
"""
import json
import time
import uuid

from lib.authz import get_role, get_user_id
from lib.dynamo import incidents_table, users_table
from lib.response import error_response, json_response
from lib.scoring import update_priority_score


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")

    incident_id = (event.get("pathParameters") or {}).get("id")
    if not incident_id:
        return error_response(400, "Missing incident id")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    text = (body.get("text") or "").strip()
    if not text:
        return error_response(400, "text is required")

    incident_pk = f"INCIDENT#{incident_id}"
    metadata = incidents_table().get_item(Key={"PK": incident_pk, "SK": "METADATA"}).get("Item")
    if metadata is None:
        return error_response(404, "Incident not found")

    profile = users_table().get_item(Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}).get("Item") or {}
    author_name = profile.get("name") or "Ciudadano"
    is_municipality = get_role(event) in ("operator", "administrator")

    comment_id = f"c-{uuid.uuid4().hex[:12]}"
    now_ms = int(time.time() * 1000)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    incidents_table().put_item(
        Item={
            "PK": incident_pk,
            "SK": f"COMMENT#{now_ms}#{comment_id}",
            "id": comment_id,
            "authorId": user_id,
            "author": author_name,
            "text": text,
            "date": now_iso,
            "isMunicipality": is_municipality,
            "likes": 0,
        }
    )

    updated = incidents_table().update_item(
        Key={"PK": incident_pk, "SK": "METADATA"},
        UpdateExpression="ADD commentsCount :d",
        ExpressionAttributeValues={":d": 1},
        ReturnValues="ALL_NEW",
    )["Attributes"]

    update_priority_score(
        incident_id,
        likes=int(updated.get("likes", 0)),
        watchers_count=int(updated.get("watchersCount", 0)),
        comments_count=int(updated["commentsCount"]),
        created_by=updated["createdBy"],
        municipality_id=updated["municipalityId"],
    )

    return json_response(
        201,
        {
            "id": comment_id,
            "author": author_name,
            "text": text,
            "date": now_iso,
            "isMunicipality": is_municipality,
            "likes": 0,
        },
    )
