import json
import os

import pytest

from handlers.photos.upload_url import handler


@pytest.fixture(autouse=True)
def photos_env():
    os.environ["PHOTOS_BUCKET"] = "test-photos"
    os.environ["PHOTOS_BASE_URL"] = "https://cdn.example.com/photos"


def _event(body, user_id="user-123"):
    event = {"body": json.dumps(body), "requestContext": {}}
    if user_id is not None:
        event["requestContext"] = {"authorizer": {"jwt": {"claims": {"sub": user_id}}}}
    return event


def test_upload_url_scopes_key_to_user():
    resp = handler(_event({"contentType": "image/jpeg"}), None)

    assert resp["statusCode"] == 201
    body = json.loads(resp["body"])
    assert body["key"].startswith("photos/user-123/") and body["key"].endswith(".jpg")
    assert body["url"] == "https://test-photos.s3.eu-central-1.amazonaws.com/"
    assert body["fields"]["key"] == body["key"]
    assert body["fields"]["Content-Type"] == "image/jpeg"
    assert body["photoUrl"] == "https://cdn.example.com/photos/" + body["key"].removeprefix("photos/")


def test_upload_url_rejects_unsupported_type():
    resp = handler(_event({"contentType": "application/pdf"}), None)
    assert resp["statusCode"] == 400


def test_upload_url_requires_user():
    resp = handler(_event({"contentType": "image/png"}, user_id=None), None)
    assert resp["statusCode"] == 401
