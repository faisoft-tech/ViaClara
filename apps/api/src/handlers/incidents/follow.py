"""PUT /incidents/{id}/follow — alternar "seguir" una incidencia. Requiere
JWT (§10 regla 6). Además del toggle idempotente en "incidents"
(SK=WATCH#<userId>, mismo patrón que like.py), mantiene un ítem espejo en
"users" (PK=USER#<userId>, SK=WATCH#<incidentId>) para poder listar
"Siguiendo" en Mis avisos (GET /users/{userId}/incidents?relation=following)
con una Query directa, sin GSI.
"""
from botocore.exceptions import ClientError

from lib.authz import get_user_id
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

    incident_pk = f"INCIDENT#{incident_id}"
    metadata_key = {"PK": incident_pk, "SK": "METADATA"}

    metadata = incidents_table().get_item(Key=metadata_key).get("Item")
    if metadata is None:
        return error_response(404, "Incident not found")

    watch_key = {"PK": incident_pk, "SK": f"WATCH#{user_id}"}
    mirror_key = {"PK": f"USER#{user_id}", "SK": f"WATCH#{incident_id}"}

    try:
        incidents_table().put_item(Item=watch_key, ConditionExpression="attribute_not_exists(PK)")
        delta, watching = 1, True
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        incidents_table().delete_item(Key=watch_key)
        delta, watching = -1, False

    if watching:
        users_table().put_item(
            Item={
                **mirror_key,
                "incidentId": incident_id,
                "title": metadata.get("title"),
                "status": metadata.get("status"),
                "municipalityId": metadata.get("municipalityId"),
            }
        )
    else:
        users_table().delete_item(Key=mirror_key)

    updated = incidents_table().update_item(
        Key=metadata_key,
        UpdateExpression="ADD watchersCount :d",
        ExpressionAttributeValues={":d": delta},
        ReturnValues="ALL_NEW",
    )["Attributes"]

    score = update_priority_score(
        incident_id,
        likes=int(updated.get("likes", 0)),
        watchers_count=int(updated["watchersCount"]),
        comments_count=int(updated.get("commentsCount", 0)),
        created_by=updated["createdBy"],
        municipality_id=updated["municipalityId"],
    )

    return json_response(
        200,
        {"watching": watching, "watchersCount": int(updated["watchersCount"]), "priorityScore": float(score)},
    )
