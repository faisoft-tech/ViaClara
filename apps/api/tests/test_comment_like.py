import json

from handlers.incidents.create import handler as create_handler
from handlers.comments.create import handler as comment_create_handler
from handlers.comments.like import handler as comment_like_handler


def _create_incident_with_comment():
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
    comment = json.loads(
        comment_create_handler(
            {
                "pathParameters": {"id": incident["id"]},
                "body": json.dumps({"text": "hola"}),
                "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "commenter-1"}}}},
            },
            None,
        )["body"]
    )
    return incident, comment


def test_comment_like_toggle(dynamodb_tables):
    incident, comment = _create_incident_with_comment()

    resp = comment_like_handler(
        {
            "pathParameters": {"id": comment["id"]},
            "queryStringParameters": {"incidentId": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "liker-1"}}}},
        },
        None,
    )
    body = json.loads(resp["body"])
    assert body == {"liked": True, "likes": 1}

    resp = comment_like_handler(
        {
            "pathParameters": {"id": comment["id"]},
            "queryStringParameters": {"incidentId": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "liker-1"}}}},
        },
        None,
    )
    assert json.loads(resp["body"]) == {"liked": False, "likes": 0}


def test_comment_like_missing_incident_id(dynamodb_tables):
    _, comment = _create_incident_with_comment()
    resp = comment_like_handler(
        {
            "pathParameters": {"id": comment["id"]},
            "queryStringParameters": None,
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "liker-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 400
