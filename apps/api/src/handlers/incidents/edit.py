"""PUT /incidents/{id} — editar una incidencia (solo autor, solo en estado
`submitted` — §10 regla 1). Solo título/descripción son editables.
"""
import json

from lib.authz import get_user_id
from lib.dynamo import incidents_table, users_table
from lib.response import error_response, json_response


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

    incident_pk = f"INCIDENT#{incident_id}"
    metadata = incidents_table().get_item(Key={"PK": incident_pk, "SK": "METADATA"}).get("Item")
    if metadata is None:
        return error_response(404, "Incident not found")

    if metadata["createdBy"] != user_id:
        return error_response(403, "Only the author can edit this incident")
    if metadata["status"] != "submitted":
        return error_response(409, "Incident can only be edited while in 'submitted' status")

    title = body.get("title")
    description = body.get("description")
    if title is None and description is None:
        return error_response(400, "Nothing to update")
    if title is not None:
        title = title.strip()
        if not title:
            return error_response(400, "title cannot be empty")

    update_expr_parts = []
    values = {}
    if title is not None:
        update_expr_parts.append("title = :t")
        values[":t"] = title
    if description is not None:
        update_expr_parts.append("description = :d")
        values[":d"] = description.strip()

    updated = incidents_table().update_item(
        Key={"PK": incident_pk, "SK": "METADATA"},
        UpdateExpression="SET " + ", ".join(update_expr_parts),
        ExpressionAttributeValues=values,
        ReturnValues="ALL_NEW",
    )["Attributes"]

    if title is not None:
        users_table().update_item(
            Key={"PK": f"USER#{user_id}", "SK": f"INCIDENT#{int(metadata['createdAt'])}#{incident_id}"},
            UpdateExpression="SET title = :t",
            ExpressionAttributeValues={":t": title},
        )

    response_body = {k: v for k, v in updated.items() if not k.startswith("GSI") and k not in ("PK", "SK")}
    return json_response(200, response_body)
