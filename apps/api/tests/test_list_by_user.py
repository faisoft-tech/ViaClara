import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.status import handler as status_handler
from handlers.incidents.list_by_user import handler as list_by_user_handler

_OPERATOR_CLAIMS = {"sub": "op-1", "cognito:groups": "[operators]"}


def _create(user_id="author-1", municipality_id="almunecar"):
    return json.loads(
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
                        "municipalityId": municipality_id,
                    }
                ),
                "requestContext": {"authorizer": {"jwt": {"claims": {"sub": user_id}}}},
            },
            None,
        )["body"]
    )


def _list_event(user_id, caller_id=None, query=None):
    return {
        "pathParameters": {"userId": user_id},
        "queryStringParameters": query,
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": caller_id or user_id}}}},
    }


def test_own_incidents_sorted_desc_by_date(dynamodb_tables):
    _create()
    _create()
    resp = list_by_user_handler(_list_event("author-1"), None)
    body = json.loads(resp["body"])
    assert len(body) == 2
    assert body[0]["createdAt"] >= body[1]["createdAt"]


def test_own_incidents_status_filter(dynamodb_tables):
    incident = _create()
    status_handler(
        {
            "pathParameters": {"id": incident["id"]},
            "body": json.dumps({"status": "open"}),
            "requestContext": {"authorizer": {"jwt": {"claims": _OPERATOR_CLAIMS}}},
        },
        None,
    )
    _create()  # stays "submitted"

    resp = list_by_user_handler(_list_event("author-1", query={"status": "open"}), None)
    body = json.loads(resp["body"])
    assert len(body) == 1
    assert body[0]["status"] == "open"


def test_cannot_list_someone_elses_incidents(dynamodb_tables):
    _create()
    resp = list_by_user_handler(_list_event("author-1", caller_id="someone-else"), None)
    assert resp["statusCode"] == 403
