import json

from handlers.users.change_municipality import handler


def test_change_own_municipality(dynamodb_tables):
    resp = handler(
        {
            "pathParameters": {"id": "user-1"},
            "body": json.dumps({"municipalityId": "motril"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "user-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 200
    assert json.loads(resp["body"])["defaultMunicipalityId"] == "motril"


def test_cannot_change_someone_elses_municipality(dynamodb_tables):
    resp = handler(
        {
            "pathParameters": {"id": "user-1"},
            "body": json.dumps({"municipalityId": "motril"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "user-2"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 403
