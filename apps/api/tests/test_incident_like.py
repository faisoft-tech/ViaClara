import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.like import handler as like_handler


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


def _like_event(incident_id, user_id):
    return {
        "pathParameters": {"id": incident_id},
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": user_id}}}},
    }


def test_like_then_unlike_toggles(dynamodb_tables):
    incident = _create()

    resp = like_handler(_like_event(incident["id"], "liker-1"), None)
    body = json.loads(resp["body"])
    assert body["liked"] is True
    assert body["likes"] == 1
    assert body["priorityScore"] == 1  # base = likes*1, tier bronze -> multiplier 1

    resp = like_handler(_like_event(incident["id"], "liker-1"), None)
    body = json.loads(resp["body"])
    assert body["liked"] is False
    assert body["likes"] == 0


def test_like_requires_auth(dynamodb_tables):
    incident = _create()
    resp = like_handler({"pathParameters": {"id": incident["id"]}, "requestContext": {}}, None)
    assert resp["statusCode"] == 401


def test_like_missing_incident(dynamodb_tables):
    resp = like_handler(_like_event("does-not-exist", "liker-1"), None)
    assert resp["statusCode"] == 404
