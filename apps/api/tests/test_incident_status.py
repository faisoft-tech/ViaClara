import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.like import handler as like_handler
from handlers.incidents.status import handler as status_handler

_OPERATOR = {"sub": "op-1", "cognito:groups": "[operators]"}


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


def _status_event(incident_id, status, claims=_OPERATOR, note=None):
    body = {"status": status}
    if note:
        body["note"] = note
    return {
        "pathParameters": {"id": incident_id},
        "body": json.dumps(body),
        "requestContext": {"authorizer": {"jwt": {"claims": claims}}},
    }


def test_status_change_requires_staff_role(dynamodb_tables):
    incident = _create()
    resp = status_handler(
        _status_event(incident["id"], "open", claims={"sub": "author-1"}),
        None,
    )
    assert resp["statusCode"] == 403


def test_cannot_resolve_directly_from_submitted(dynamodb_tables):
    incident = _create()
    resp = status_handler(_status_event(incident["id"], "resolved"), None)
    assert resp["statusCode"] == 409


def test_decline_requires_note(dynamodb_tables):
    incident = _create()
    resp = status_handler(_status_event(incident["id"], "declined"), None)
    assert resp["statusCode"] == 400


def test_resolve_flow_awards_points_equal_to_priority_score(dynamodb_tables):
    incident = _create()
    like_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "liker-1"}}}},
        },
        None,
    )

    status_handler(_status_event(incident["id"], "open"), None)
    status_handler(_status_event(incident["id"], "in_progress"), None)
    resp = status_handler(_status_event(incident["id"], "resolved"), None)

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["status"] == "resolved"
    assert body["pointsAwarded"] == 1  # 1 like * 1 * tier bronze multiplier 1
