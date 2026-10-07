"""DELETE /incidents/{id} — eliminar una incidencia: el ciudadano solo la
propia, operario/administrador cualquiera (§10 regla 5, §13). Limpia también
los ítems hijos (comentarios, likes, follows) y los espejos en "users"
(el propio de "Mis avisos" y el de cada seguidor).
"""
from boto3.dynamodb.conditions import Key

from lib.authz import get_role, get_user_id
from lib.dynamo import incidents_table, users_table
from lib.response import error_response, json_response


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")

    incident_id = (event.get("pathParameters") or {}).get("id")
    if not incident_id:
        return error_response(400, "Missing incident id")

    incident_pk = f"INCIDENT#{incident_id}"
    resp = incidents_table().query(KeyConditionExpression=Key("PK").eq(incident_pk))
    items = resp.get("Items", [])
    metadata = next((i for i in items if i["SK"] == "METADATA"), None)
    if metadata is None:
        return error_response(404, "Incident not found")

    if metadata["createdBy"] != user_id and get_role(event) not in ("operator", "administrator"):
        return error_response(403, "Not allowed to delete this incident")

    for item in items:
        incidents_table().delete_item(Key={"PK": incident_pk, "SK": item["SK"]})

    users_table().delete_item(
        Key={"PK": f"USER#{metadata['createdBy']}", "SK": f"INCIDENT#{int(metadata['createdAt'])}#{incident_id}"}
    )
    for item in items:
        if item["SK"].startswith("WATCH#"):
            watcher_id = item["SK"].split("#", 1)[1]
            users_table().delete_item(Key={"PK": f"USER#{watcher_id}", "SK": f"WATCH#{incident_id}"})

    return json_response(200, {"deleted": True})
