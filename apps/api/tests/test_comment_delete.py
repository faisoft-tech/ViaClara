import json

from handlers.incidents.create import handler as create_handler
from handlers.incidents.get import handler as get_handler
from handlers.comments.create import handler as comment_create_handler
from handlers.comments.delete import handler as comment_delete_handler


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


def test_delete_own_comment(dynamodb_tables):
    incident, comment = _create_incident_with_comment()
    resp = comment_delete_handler(
        {
            "pathParameters": {"id": comment["id"]},
            "queryStringParameters": {"incidentId": incident["id"]},
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "commenter-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 200

    detail = json.loads(get_handler({"pathParameters": {"id": incident["id"]}, "requestContext": {}}, None)["body"])
    assert detail["comments"] == []


def test_operator_cannot_delete_others_comment(dynamodb_tables):
    incident, comment = _create_incident_with_comment()
    resp = comment_delete_handler(
        {
            "pathParameters": {"id": comment["id"]},
            "queryStringParameters": {"incidentId": incident["id"]},
            "requestContext": {
                "authorizer": {"jwt": {"claims": {"sub": "op-1", "cognito:groups": "[operators]"}}}
            },
        },
        None,
    )
    assert resp["statusCode"] == 403


def test_administrator_can_delete_others_comment(dynamodb_tables):
    incident, comment = _create_incident_with_comment()
    resp = comment_delete_handler(
        {
            "pathParameters": {"id": comment["id"]},
            "queryStringParameters": {"incidentId": incident["id"]},
            "requestContext": {
                "authorizer": {"jwt": {"claims": {"sub": "admin-1", "cognito:groups": "[administrators]"}}}
            },
        },
        None,
    )
    assert resp["statusCode"] == 200
