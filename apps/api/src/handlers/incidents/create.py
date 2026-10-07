"""POST /incidents — crear una incidencia (RF-001/CU-001). Requiere JWT
(el authorizer de API Gateway ya validó el token; aquí solo se lee el claim
`sub` como `createdBy`).
"""
import json
import time
import uuid
from decimal import Decimal

from lib.authz import get_user_id
from lib.dynamo import incidents_table, users_table
from lib.models import INCIDENT_CATEGORIES
from lib.photos import parse_photo_keys, photo_url
from lib.response import error_response, json_response


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    title = (body.get("title") or "").strip()
    category = body.get("category")
    description = (body.get("description") or "").strip()
    address = (body.get("address") or "").strip()
    lat = body.get("lat")
    lng = body.get("lng")
    municipality_id = body.get("municipalityId")

    if (
        not title
        or category not in INCIDENT_CATEGORIES
        or not address
        or lat is None
        or lng is None
        or not municipality_id
    ):
        return error_response(400, "Missing or invalid required fields")

    # Keys returned by POST /photos; only the caller's own uploads are accepted.
    photo_keys = parse_photo_keys(body.get("photos"), user_id)
    if photo_keys is None:
        return error_response(400, "Invalid photos")

    profile = users_table().get_item(Key={"PK": f"USER#{user_id}", "SK": "PROFILE"}).get("Item") or {}

    incident_id = f"inc-{uuid.uuid4().hex[:12]}"
    now_ms = int(time.time() * 1000)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    item = {
        "PK": f"INCIDENT#{incident_id}",
        "SK": "METADATA",
        "id": incident_id,
        "title": title,
        "category": category,
        "status": "submitted",
        "description": description,
        "address": address,
        # DynamoDB no acepta float nativo — hay que pasar por Decimal(str(...)).
        "lat": Decimal(str(lat)),
        "lng": Decimal(str(lng)),
        "municipalityId": municipality_id,
        "createdBy": user_id,
        # Denormalized so lists can show the author without an N+1 GetItem.
        "authorName": profile.get("name") or "Ciudadano",
        "createdAt": now_ms,
        "date": now_iso,
        "likes": 0,
        "watchersCount": 0,
        "commentsCount": 0,
        # priorityScore denormalizado: 0 al crear (sin interacción todavía);
        # se recalcula en cada like/follow/comment (lib/scoring.py).
        "priorityScore": 0,
        "history": [{"status": "submitted", "date": now_iso}],
        "photos": [photo_url(key) for key in photo_keys],
        # Único GSI de la tabla (by-municipality), ordenado por fecha. El
        # orden por prioridad se calcula en memoria en list_by_municipality.
        "GSI1PK": f"MUNICIPALITY#{municipality_id}",
        "GSI1SK": now_ms,
    }

    incidents_table().put_item(Item=item)

    # Ítem espejo en "users" para "Mis avisos" (GET /users/{userId}/incidents)
    # sin necesitar GSI ni N+1: campos denormalizados que status.py mantiene
    # en sync cada vez que cambia el estado.
    users_table().put_item(
        Item={
            "PK": f"USER#{user_id}",
            "SK": f"INCIDENT#{now_ms}#{incident_id}",
            "incidentId": incident_id,
            "title": title,
            "category": category,
            "status": "submitted",
            "address": address,
            "municipalityId": municipality_id,
            "date": now_iso,
            "createdAt": now_ms,
        }
    )

    response_body = {k: v for k, v in item.items() if not k.startswith("GSI") and k not in ("PK", "SK")}
    return json_response(201, response_body)
