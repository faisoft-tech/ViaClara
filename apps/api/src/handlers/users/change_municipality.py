"""PUT /users/{id}/municipality — cambiar el municipio activo del usuario
(RF-014/CU-005). Solo el propio usuario puede cambiarlo (§9.1: "el usuario lo
cambia libremente desde Perfil"); no se valida `municipalityId` contra la
tabla "municipalities" — mismo criterio que POST /incidents: es un id de
referencia libre, no una FK forzada por infraestructura.
"""
import json

from lib.authz import get_user_id
from lib.dynamo import users_table
from lib.response import error_response, json_response


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")

    path_user_id = (event.get("pathParameters") or {}).get("id")
    if path_user_id != user_id:
        return error_response(403, "Can only change your own active municipality")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    municipality_id = body.get("municipalityId")
    if not municipality_id:
        return error_response(400, "municipalityId is required")

    users_table().update_item(
        Key={"PK": f"USER#{user_id}", "SK": "PROFILE"},
        UpdateExpression="SET defaultMunicipalityId = :m",
        ExpressionAttributeValues={":m": municipality_id},
    )

    return json_response(200, {"id": user_id, "defaultMunicipalityId": municipality_id})
