"""GET /municipalities — lista de municipios (tenants). Todos los ítems
comparten la partición constante PK=MUNICIPALITY (ver infra/dynamodb.tf), así
que listar es una Query barata y acotada, no un Scan.
"""
from boto3.dynamodb.conditions import Key

from lib.dynamo import municipalities_table
from lib.response import json_response


def handler(event, context):
    resp = municipalities_table().query(KeyConditionExpression=Key("PK").eq("MUNICIPALITY"))
    items = resp.get("Items", [])
    cleaned = [{k: v for k, v in i.items() if k not in ("PK", "SK")} for i in items]
    return json_response(200, cleaned)
