"""Helpers de respuesta para Lambdas detrás de API Gateway (HTTP API, formato
de payload 2.0: proxy integration con statusCode/headers/body).
"""
import json
from decimal import Decimal
from typing import Any


def _json_default(value: Any):
    if isinstance(value, Decimal):
        # DynamoDB devuelve todos los números como Decimal; json.dumps no sabe
        # serializarlos, así que los convertimos a int/float según corresponda.
        return int(value) if value % 1 == 0 else float(value)
    return str(value)


def json_response(status_code: int, body: Any) -> dict:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=_json_default),
    }


def error_response(status_code: int, message: str) -> dict:
    return json_response(status_code, {"error": message})
