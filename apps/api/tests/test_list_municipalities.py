import json
from decimal import Decimal

from lib.dynamo import municipalities_table
from handlers.municipalities.list import handler


def test_list_municipalities(dynamodb_tables):
    municipalities_table().put_item(
        Item={
            "PK": "MUNICIPALITY",
            "SK": "almunecar",
            "id": "almunecar",
            "name": "Almuñécar",
            "province": "Granada",
            "center": {"lat": Decimal("36.7339"), "lng": Decimal("-3.6907")},
        }
    )
    municipalities_table().put_item(
        Item={
            "PK": "MUNICIPALITY",
            "SK": "motril",
            "id": "motril",
            "name": "Motril",
            "province": "Granada",
            "center": {"lat": Decimal("36.7495"), "lng": Decimal("-3.5197")},
        }
    )

    resp = handler({}, None)

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert {m["id"] for m in body} == {"almunecar", "motril"}
    assert "PK" not in body[0] and "SK" not in body[0]


def test_list_municipalities_empty(dynamodb_tables):
    resp = handler({}, None)

    assert resp["statusCode"] == 200
    assert json.loads(resp["body"]) == []
