import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.follow import handler as follow_handler
from handlers.incidents.list_by_user import handler as list_by_user_handler


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


def _follow_event(incident_id, user_id):
    return {
        "pathParameters": {"id": incident_id},
        "requestContext": {"authorizer": {"jwt": {"claims": {"sub": user_id}}}},
    }


def test_follow_writes_mirror_item_then_unfollow_removes_it(dynamodb_tables):
    incident = _create()

    resp = follow_handler(_follow_event(incident["id"], "follower-1"), None)
    body = json.loads(resp["body"])
    assert body["watching"] is True
    assert body["watchersCount"] == 1

    listing = json.loads(
        list_by_user_handler(
            {
                "pathParameters": {"userId": "follower-1"},
                "queryStringParameters": {"relation": "following"},
                "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "follower-1"}}}},
            },
            None,
        )["body"]
    )
    assert len(listing) == 1
    assert listing[0]["id"] == incident["id"]

    resp = follow_handler(_follow_event(incident["id"], "follower-1"), None)
    body = json.loads(resp["body"])
    assert body["watching"] is False
    assert body["watchersCount"] == 0

    listing = json.loads(
        list_by_user_handler(
            {
                "pathParameters": {"userId": "follower-1"},
                "queryStringParameters": {"relation": "following"},
                "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "follower-1"}}}},
            },
            None,
        )["body"]
    )
    assert listing == []
