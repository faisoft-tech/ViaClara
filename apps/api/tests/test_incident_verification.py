import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.like import handler as like_handler
from handlers.incidents.status import handler as status_handler
from handlers.incidents.verification import handler as verification_handler
from handlers.municipalities.ranking import handler as ranking_handler

_OPERATOR_CLAIMS = {"sub": "op-1", "cognito:groups": "[operators]"}


def _create_and_resolve():
    incident = json.loads(
        create_handler(
            {
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
            },
            None,
        )["body"]
    )
    like_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "liker-1"}}}},
        },
        None,
    )

    def _status(status):
        status_handler(
            {
                "pathParameters": {"id": incident["id"]},
                "body": json.dumps({"status": status}),
                "requestContext": {"authorizer": {"jwt": {"claims": _OPERATOR_CLAIMS}}},
            },
            None,
        )

    _status("open")
    _status("in_progress")
    _status("resolved")
    return incident


def _verify_event(incident_id, result, user_id="author-1"):
    return {
        "pathParameters": {"id": incident_id},
        "body": json.dumps({"result": result}),
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": user_id}}}},
    }


def test_verified_keeps_points(dynamodb_tables):
    incident = _create_and_resolve()

    resp = verification_handler(_verify_event(incident["id"], "verified"), None)
    assert resp["statusCode"] == 200

    ranking = json.loads(
        ranking_handler({"pathParameters": {"municipalityId": "almunecar"}}, None)["body"]
    )
    assert ranking[0]["points"] == 1


def test_not_resolved_reverts_points_and_reopens(dynamodb_tables):
    incident = _create_and_resolve()

    resp = verification_handler(_verify_event(incident["id"], "not_resolved"), None)
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["status"] == "in_progress"

    ranking = json.loads(
        ranking_handler({"pathParameters": {"municipalityId": "almunecar"}}, None)["body"]
    )
    assert ranking == [] or ranking[0]["points"] == 0


def test_verification_only_author_allowed(dynamodb_tables):
    incident = _create_and_resolve()
    resp = verification_handler(_verify_event(incident["id"], "verified", user_id="someone-else"), None)
    assert resp["statusCode"] == 403
