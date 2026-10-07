"""PUT /incidents/{id}/status — cambiar el estado de una incidencia (operario
o administrador — CU-003/§13). Aplica §10 reglas 2 y 3, y otorga puntos al
autor al resolver (regla 11: exactamente el priorityScore actual).

Nota: §10 regla 4 ("un operario solo puede gestionar incidencias de su
categoría/departamento") no se aplica aquí — el modelo de datos (§9.1) no
tiene ningún campo de departamento/categoría asignada al operario todavía,
así que no hay nada contra lo que validarlo. Queda como TODO si se modela.
"""
import json
import time

from lib.authz import get_role, get_user_id
from lib.dynamo import incidents_table, users_table
from lib.models import INCIDENT_STATUSES
from lib.response import error_response, json_response
from lib.scoring import adjust_points


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")
    if get_role(event) not in ("operator", "administrator"):
        return error_response(403, "Only operators or administrators can change status")

    incident_id = (event.get("pathParameters") or {}).get("id")
    if not incident_id:
        return error_response(400, "Missing incident id")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    new_status = body.get("status")
    note = (body.get("note") or "").strip() or None
    if new_status not in INCIDENT_STATUSES:
        return error_response(400, "Invalid status")

    incident_pk = f"INCIDENT#{incident_id}"
    metadata = incidents_table().get_item(Key={"PK": incident_pk, "SK": "METADATA"}).get("Item")
    if metadata is None:
        return error_response(404, "Incident not found")

    current_status = metadata["status"]

    if new_status == "resolved" and current_status != "in_progress":
        return error_response(409, "An incident can only be resolved from 'in_progress' (§10 rule 2)")
    if new_status == "declined":
        if current_status not in ("submitted", "open"):
            return error_response(409, "An incident can only be declined from 'submitted' or 'open' (§10 rule 3)")
        if not note:
            return error_response(400, "note is required to decline an incident (§10 rule 3)")

    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    history_entry = {"status": new_status, "date": now_iso}
    if note:
        history_entry["note"] = note

    update_expr = "SET #s = :s, history = list_append(history, :h)"
    values = {":s": new_status, ":h": [history_entry]}
    if new_status in ("resolved", "declined") and note:
        update_expr += ", resolution = :r"
        values[":r"] = {"date": now_iso, "note": note}

    updated = incidents_table().update_item(
        Key={"PK": incident_pk, "SK": "METADATA"},
        UpdateExpression=update_expr,
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues=values,
        ReturnValues="ALL_NEW",
    )["Attributes"]

    # Mirror item de "Mis avisos" (ver create.py) — mantener el status en sync.
    users_table().update_item(
        Key={"PK": f"USER#{metadata['createdBy']}", "SK": f"INCIDENT#{int(metadata['createdAt'])}#{incident_id}"},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": new_status},
    )

    points_awarded = None
    if new_status == "resolved":
        # RF-016/§10 regla 11: el autor gana exactamente el priorityScore
        # actual de la incidencia en el momento de resolverse. Se guarda en
        # `pointsAwarded` para poder revertirlo si luego se verifica como
        # "no resuelto" (ver verification.py).
        points_awarded = updated.get("priorityScore", 0)
        profile = (
            users_table().get_item(Key={"PK": f"USER#{metadata['createdBy']}", "SK": "PROFILE"}).get("Item") or {}
        )
        adjust_points(
            metadata["createdBy"],
            metadata["municipalityId"],
            float(points_awarded),
            author_name=profile.get("name"),
        )
        incidents_table().update_item(
            Key={"PK": incident_pk, "SK": "METADATA"},
            UpdateExpression="SET pointsAwarded = :p",
            ExpressionAttributeValues={":p": points_awarded},
        )

    response_body = {k: v for k, v in updated.items() if not k.startswith("GSI") and k not in ("PK", "SK")}
    if points_awarded is not None:
        response_body["pointsAwarded"] = points_awarded
    return json_response(200, response_body)
