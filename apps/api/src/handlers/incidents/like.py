"""PUT /incidents/{id}/like — alternar "me gusta" (apoyo) de una incidencia.
Requiere JWT (§10 regla 6: interactuar socialmente exige cuenta).

Toggle idempotente vía PutItem con ConditionExpression sobre
SK=LIKE#<userId> (ver infra/dynamodb.tf), luego un ADD atómico del contador
`likes` y recálculo de `priorityScore` (RF-015/§10 regla 10) con el tier
actual del autor. Dos escrituras separadas, no una transacción — ver nota en
lib/scoring.py.
"""
from botocore.exceptions import ClientError

from lib.authz import get_user_id
from lib.dynamo import incidents_table
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

    like_key = {"PK": incident_pk, "SK": f"LIKE#{user_id}"}
    try:
        incidents_table().put_item(Item=like_key, ConditionExpression="attribute_not_exists(PK)")
        delta, liked = 1, True
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        incidents_table().delete_item(Key=like_key)
        delta, liked = -1, False

    updated = incidents_table().update_item(
        Key=metadata_key,
        UpdateExpression="ADD likes :d",
        ExpressionAttributeValues={":d": delta},
        ReturnValues="ALL_NEW",
    )["Attributes"]

    score = update_priority_score(
        incident_id,
        likes=int(updated["likes"]),
        watchers_count=int(updated.get("watchersCount", 0)),
        comments_count=int(updated.get("commentsCount", 0)),
        created_by=updated["createdBy"],
        municipality_id=updated["municipalityId"],
    )

    return json_response(200, {"liked": liked, "likes": int(updated["likes"]), "priorityScore": float(score)})
