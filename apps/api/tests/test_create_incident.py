import json

import pytest

from handlers.incidents.create import handler


def _event(body, user_id="user-123"):
    event = {"body": json.dumps(body)}
    if user_id is not None:
        event["requestContext"] = {"authorizer": {"jwt": {"claims": {"sub": user_id}}}}
    else:
        event["requestContext"] = {}
    return event


def test_create_incident_success(dynamodb_tables):
    event = _event(
        {
            "title": "Bache en la calzada",
            "category": "road",
            "description": "Bache profundo",
            "address": "Calle Mayor 1",
            "lat": 36.73,
            "lng": -3.69,
            "municipalityId": "almunecar",
        }
    )

    resp = handler(event, None)

    assert resp["statusCode"] == 201
    body = json.loads(resp["body"])
    assert body["title"] == "Bache en la calzada"
    assert body["status"] == "submitted"
    assert body["createdBy"] == "user-123"
    assert body["priorityScore"] == 0
    assert "PK" not in body and "SK" not in body


def test_create_incident_missing_fields(dynamodb_tables):
    resp = handler(_event({"title": "Solo título"}), None)
    assert resp["statusCode"] == 400


def test_create_incident_invalid_category(dynamodb_tables):
    resp = handler(
        _event(
            {
                "title": "x",
                "category": "no-existe",
                "address": "y",
                "lat": 1,
                "lng": 1,
                "municipalityId": "almunecar",
            }
        ),
        None,
    )
    assert resp["statusCode"] == 400


def test_create_incident_requires_auth(dynamodb_tables):
    resp = handler(_event({"title": "x"}, user_id=None), None)
    assert resp["statusCode"] == 401


_VALID = {
    "title": "Bache",
    "category": "road",
    "address": "Calle Mayor 1",
    "lat": 36.73,
    "lng": -3.69,
    "municipalityId": "almunecar",
}


def test_create_incident_with_own_photos(dynamodb_tables, monkeypatch):
    monkeypatch.setenv("PHOTOS_BASE_URL", "https://cdn.example.com/photos")
    resp = handler(_event({**_VALID, "photos": ["photos/user-123/abc.jpg"]}), None)

    assert resp["statusCode"] == 201
    assert json.loads(resp["body"])["photos"] == ["https://cdn.example.com/photos/user-123/abc.jpg"]


@pytest.mark.parametrize(
    "photos",
    [
        ["photos/other-user/abc.jpg"],
        ["photos/user-123/../other-user/abc.jpg"],
        ["photos/user-123/a.jpg", "photos/user-123/b.jpg", "photos/user-123/c.jpg", "photos/user-123/d.jpg"],
        "photos/user-123/abc.jpg",
    ],
)
def test_create_incident_rejects_invalid_photos(dynamodb_tables, photos):
    resp = handler(_event({**_VALID, "photos": photos}), None)
    assert resp["statusCode"] == 400
