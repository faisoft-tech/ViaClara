"""GET /municipalities/{municipalityId}/incidents — listado de un municipio.

Único GSI de la tabla (`by-municipality`, GSI1PK/GSI1SK=createdAt): `?sort=date`
usa directamente el orden del GSI (fecha descendente). El orden por defecto,
priorityScore descendente (RF-015/§10 regla 10), se calcula en memoria tras la
Query — a escala de piloto (1-2 municipios) es más simple y barato que
mantener un segundo GSI cuyo sort key se reescribiría en cada like/comentario.
Los filtros de estado/categoría también se aplican en memoria — evita GSIs
adicionales por cada combinación de filtro.
"""
from boto3.dynamodb.conditions import Key

from lib.dynamo import incidents_table
from lib.response import error_response, json_response

_GSI_KEYS = ("GSI1PK", "GSI1SK")


def handler(event, context):
    municipality_id = (event.get("pathParameters") or {}).get("municipalityId")
    if not municipality_id:
        return error_response(400, "Missing municipalityId")

    query_params = event.get("queryStringParameters") or {}
    sort = query_params.get("sort", "priority")
    status_filter = query_params.get("status")
    category_filter = query_params.get("category")

    resp = incidents_table().query(
        IndexName="by-municipality",
        KeyConditionExpression=Key("GSI1PK").eq(f"MUNICIPALITY#{municipality_id}"),
        ScanIndexForward=False,
    )
    items = resp.get("Items", [])

    if status_filter:
        items = [i for i in items if i.get("status") == status_filter]
    if category_filter:
        items = [i for i in items if i.get("category") == category_filter]

    if sort != "date":
        items = sorted(items, key=lambda i: i.get("priorityScore", 0), reverse=True)

    cleaned = [{k: v for k, v in i.items() if k not in _GSI_KEYS and k not in ("PK", "SK")} for i in items]

    return json_response(200, cleaned)
