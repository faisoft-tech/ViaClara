import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.edit import handler as edit_handler
from handlers.incidents.status import handler as status_handler


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


def test_edit_title_by_author_succeeds(dynamodb_tables):
    incident = _create()
    resp = edit_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"title": "Bache profundo"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "author-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["title"] == "Bache profundo"


def test_edit_by_non_author_forbidden(dynamodb_tables):
    incident = _create()
    resp = edit_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"title": "x"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "someone-else"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 403


def test_edit_after_submitted_status_rejected(dynamodb_tables):
    incident = _create()
    status_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"status": "open"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "op-1", "cognito:groups": "[operators]"}}}},
        },
        None,
    )

    resp = edit_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"title": "x"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "author-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 409
