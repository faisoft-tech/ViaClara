import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.delete import handler as delete_handler
from handlers.incidents.get import handler as get_handler


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


def test_delete_by_author_succeeds_and_removes_incident(dynamodb_tables):
    incident = _create()
    resp = delete_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "author-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 200

    get_resp = get_handler({"pathParameters": {"id": incident["id"]}, "requestContext": {}}, None)
    assert get_resp["statusCode"] == 404


def test_delete_by_other_citizen_forbidden(dynamodb_tables):
    incident = _create()
    resp = delete_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "someone-else"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 403


def test_delete_by_operator_succeeds(dynamodb_tables):
    incident = _create()
    resp = delete_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "op-1", "cognito:groups": "[operators]"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 200
