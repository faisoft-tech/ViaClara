import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.list_by_municipality import handler as list_handler


def _create(title, municipality_id="almunecar", category="road", user_id="user-1"):
    event = {
        "body": json.dumps(
            {
                "title": title,
                "category": category,
                "description": "desc",
                "address": "addr",
                "lat": 36.73,
                "lng": -3.69,
                "municipalityId": municipality_id,
            }
        ),
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": user_id}}}},
    }
    return json.loads(create_handler(event, None)["body"])


def test_list_by_municipality_filters_by_municipality(dynamodb_tables):
    _create("Aviso 1")
    _create("Aviso 2")
    _create("Otro municipio", municipality_id="salobrena")

    resp = list_handler(
        {"pathParameters": {"municipalityId": "almunecar"}, "queryStringParameters": None},
        None,
    )

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert len(body) == 2
    assert all(i["municipalityId"] == "almunecar" for i in body)


def test_list_by_municipality_category_filter(dynamodb_tables):
    _create("Bache", category="road")
    _create("Farola", category="lighting")

    resp = list_handler(
        {
            "pathParameters": {"municipalityId": "almunecar"},
            "queryStringParameters": {"category": "lighting"},
        },
        None,
    )

    body = json.loads(resp["body"])
    assert len(body) == 1
    assert body[0]["category"] == "lighting"


def test_list_by_municipality_missing_id(dynamodb_tables):
    resp = list_handler({"pathParameters": {}, "queryStringParameters": None}, None)
    assert resp["statusCode"] == 400
