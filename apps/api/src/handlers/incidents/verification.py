"""PUT /incidents/{id}/verification — verificación ciudadana del cierre
(solo el autor — RF-013/CU-004/§10 regla 8). Si el resultado es
"not_resolved", revierte los puntos otorgados al resolver (regla 11) y
reabre la incidencia a `in_progress`.
"""
import json
import time

from lib.authz import get_user_id
from lib.dynamo import incidents_table, users_table
from lib.response import error_response, json_response
from lib.scoring import adjust_points

_VALID_RESULTS = ("verified", "not_resolved")


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

    result = body.get("result")
    if result not in _VALID_RESULTS:
        return error_response(400, "result must be 'verified' or 'not_resolved'")

    incident_pk = f"INCIDENT#{incident_id}"
    metadata = incidents_table().get_item(Key={"PK": incident_pk, "SK": "METADATA"}).get("Item")
    if metadata is None:
        return error_response(404, "Incident not found")

    if metadata["createdBy"] != user_id:
        return error_response(403, "Only the author can verify the closure of this incident")
    if metadata["status"] != "resolved":
        return error_response(409, "Only a 'resolved' incident can be verified")

    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    update_expr = "SET verification = :v"
    values = {":v": {"result": result, "date": now_iso}}
    names = {}

    if result == "not_resolved":
        points_awarded = metadata.get("pointsAwarded", 0)
        if points_awarded:
            adjust_points(metadata["createdBy"], metadata["municipalityId"], -float(points_awarded))
        update_expr += ", #s = :s, pointsAwarded = :zero, history = list_append(history, :h)"
        names["#s"] = "status"
        values[":s"] = "in_progress"
        values[":zero"] = 0
        values[":h"] = [
            {"status": "in_progress", "date": now_iso, "note": "Reabierta: el autor marcó 'No resuelto'"}
        ]

    kwargs = {
        "Key": {"PK": incident_pk, "SK": "METADATA"},
        "UpdateExpression": update_expr,
        "ExpressionAttributeValues": values,
        "ReturnValues": "ALL_NEW",
    }
    if names:
        kwargs["ExpressionAttributeNames"] = names

    updated = incidents_table().update_item(**kwargs)["Attributes"]

    if result == "not_resolved":
        users_table().update_item(
            Key={
                "PK": f"USER#{metadata['createdBy']}",
                "SK": f"INCIDENT#{int(metadata['createdAt'])}#{incident_id}",
            },
            UpdateExpression="SET #s = :s",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": "in_progress"},
        )

    response_body = {k: v for k, v in updated.items() if not k.startswith("GSI") and k not in ("PK", "SK")}
    return json_response(200, response_body)
