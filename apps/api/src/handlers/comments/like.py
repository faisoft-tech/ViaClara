"""PUT /comments/{id}/like — alternar "me gusta" de un comentario. Requiere
JWT (§10 regla 6).

Desviación deliberada de DOCUMENTO_VIACLARA.md §14: el path del documento no
incluye el id de la incidencia, pero en DynamoDB todo comentario vive bajo
PK=INCIDENT#<incidentId> (patrón adjacency-list) y no hay forma de localizar
un ítem por su id de comentario sin conocer su partición. Se añade
`?incidentId=` como query param obligatorio — el frontend siempre lo tiene
disponible (está viendo el detalle de esa incidencia). Ver apps/api/README.md.
"""
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from lib.authz import get_user_id
from lib.dynamo import incidents_table
from lib.response import error_response, json_response


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

    like_key = {"PK": incident_pk, "SK": f"LIKE#COMMENT#{comment_id}#{user_id}"}
    try:
        incidents_table().put_item(Item=like_key, ConditionExpression="attribute_not_exists(PK)")
        delta, liked = 1, True
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise
        incidents_table().delete_item(Key=like_key)
        delta, liked = -1, False

    updated = incidents_table().update_item(
        Key={"PK": incident_pk, "SK": comment["SK"]},
        UpdateExpression="ADD likes :d",
        ExpressionAttributeValues={":d": delta},
        ReturnValues="ALL_NEW",
    )["Attributes"]

    return json_response(200, {"liked": liked, "likes": int(updated["likes"])})
