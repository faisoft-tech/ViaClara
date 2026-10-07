"""DELETE /comments/{id}?incidentId=... — eliminar un comentario: el
ciudadano solo el propio, el administrador cualquiera (§13 — los operarios NO
pueden borrar comentarios ajenos). Mismo query param `incidentId` que
PUT /comments/{id}/like — ver la nota de desviación en ese handler.
"""
from boto3.dynamodb.conditions import Key

from lib.authz import get_role, get_user_id
from lib.dynamo import incidents_table
from lib.response import error_response, json_response
from lib.scoring import update_priority_score


def _find_comment(incident_pk, comment_id):
    resp = incidents_table().query(
        KeyConditionExpression=Key("PK").eq(incident_pk) & Key("SK").begins_with("COMMENT#")
    )
    return next((c for c in resp.get("Items", []) if c.get("id") == comment_id), None)


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")

    comment_id = (event.get("pathParameters") or {}).get("id")
    incident_id = (event.get("queryStringParameters") or {}).get("incidentId")
    if not comment_id or not incident_id:
        return error_response(400, "Missing comment id or incidentId query param")

    incident_pk = f"INCIDENT#{incident_id}"
    comment = _find_comment(incident_pk, comment_id)
    if comment is None:
        return error_response(404, "Comment not found")

    if comment.get("authorId") != user_id and get_role(event) != "administrator":
        return error_response(403, "Not allowed to delete this comment")

    incidents_table().delete_item(Key={"PK": incident_pk, "SK": comment["SK"]})

    updated = incidents_table().update_item(
        Key={"PK": incident_pk, "SK": "METADATA"},
        UpdateExpression="ADD commentsCount :d",
        ExpressionAttributeValues={":d": -1},
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

    return json_response(200, {"deleted": True})
