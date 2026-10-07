import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.get import handler as get_handler
from handlers.comments.create import handler as comment_create_handler


def _create():
    event = {
        "body": json.dumps(
            {
                "title": "Bache",
                "category": "road",
                "description": "desc",
                "address": "addr",
                "lat": 36.73,
                "lng": -3.69,
                "municipalityId": "almunecar",
            }
        ),
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "author-1"}}}},
    }
    return json.loads(create_handler(event, None)["body"])


def test_create_comment_appears_in_incident_detail(dynamodb_tables):
    incident = _create()
    resp = comment_create_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"text": "Confirmo, sigue igual"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "commenter-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 201
    assert json.loads(resp["body"])["isMunicipality"] is False

    detail = json.loads(get_handler({"pathParameters": {"id": incident["id"]}, "requestContext": {}}, None)["body"])
    assert len(detail["comments"]) == 1
    assert detail["comments"][0]["text"] == "Confirmo, sigue igual"


def test_comment_as_municipality_flag(dynamodb_tables):
    incident = _create()
    resp = comment_create_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"text": "Aviso asignado"}),
            "requestContext": {
                "authorizer": {"jwt": {"claims": {"sub": "op-1", "cognito:groups": "[operators]"}}}
            },
        },
        None,
    )
    assert json.loads(resp["body"])["isMunicipality"] is True


def test_create_comment_requires_text(dynamodb_tables):
    incident = _create()
    resp = comment_create_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"text": "  "}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "commenter-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 400
