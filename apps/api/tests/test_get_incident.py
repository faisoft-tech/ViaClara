import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.get import handler as get_handler


def _create(title="Farola fundida", user_id="user-abc"):
    event = {
        "body": json.dumps(
            {
                "title": title,
                "category": "lighting",
                "description": "No enciende",
                "address": "Paseo Marítimo",
                "lat": 36.73,
                "lng": -3.69,
                "municipalityId": "almunecar",
            }
        ),
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": user_id}}}},
    }
    return json.loads(create_handler(event, None)["body"])


def test_get_incident_after_create(dynamodb_tables):
    created = _create()

    resp = get_handler(
        {
            "pathParameters": {"id": created["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "user-abc"}}}},
        },
        None,
    )

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["id"] == created["id"]
    assert body["comments"] == []
    assert body["liked"] is False


def test_get_incident_not_found(dynamodb_tables):
    resp = get_handler({"pathParameters": {"id": "nope"}, "requestContext": {}}, None)
    assert resp["statusCode"] == 404


def test_get_incident_missing_id(dynamodb_tables):
    resp = get_handler({"pathParameters": {}, "requestContext": {}}, None)
    assert resp["statusCode"] == 400
