"""GET /users/{userId}/incidents — "Mis avisos" (RF-017/CU-007). Orden fijo:
fecha descendente, con independencia de la puntuación de prioridad (§10
regla 12). `relation=own` (por defecto) usa el ítem espejo de "users" sin
N+1 (denormalizado, ver create.py/status.py); `relation=following` sí hace
N+1 GetItem sobre la incidencia real — el espejo que escribe follow.py es
deliberadamente un puntero fino, sin duplicar campos que cambian con el
estado, para no tener que reescribir el espejo de cada seguidor en cada
cambio de estado de la incidencia.
"""
from boto3.dynamodb.conditions import Key

from lib.authz import get_user_id
from lib.dynamo import incidents_table, users_table
from lib.response import error_response, json_response


def handler(event, context):
    caller_id = get_user_id(event)
    if not caller_id:
        return error_response(401, "Missing authenticated user")

    user_id = (event.get("pathParameters") or {}).get("userId")
    if not user_id:
        return error_response(400, "Missing userId")
    if user_id != caller_id:
        return error_response(403, "Can only list your own incidents")

    query_params = event.get("queryStringParameters") or {}
    relation = query_params.get("relation", "own")
    status_filter = query_params.get("status")
    location_filter = (query_params.get("location") or "").strip().lower()

    if relation == "following":
        resp = users_table().query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("WATCH#")
        )
        incidents = []
        for pointer in resp.get("Items", []):
            metadata = incidents_table().get_item(
                Key={"PK": f"INCIDENT#{pointer['incidentId']}", "SK": "METADATA"}
            ).get("Item")
            if metadata:
                incidents.append(metadata)
        incidents.sort(key=lambda i: int(i.get("createdAt", 0)), reverse=True)
    else:
        resp = users_table().query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("INCIDENT#"),
            ScanIndexForward=False,
        )
        incidents = resp.get("Items", [])

    if status_filter:
        incidents = [i for i in incidents if i.get("status") == status_filter]
    if location_filter:
        incidents = [i for i in incidents if location_filter in (i.get("address") or "").lower()]

    cleaned = [{k: v for k, v in i.items() if k not in ("PK", "SK") and not k.startswith("GSI")} for i in incidents]
    return json_response(200, cleaned)
