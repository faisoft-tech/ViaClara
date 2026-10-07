"""Tests de handlers.auth.verify — ver la nota en test_auth_start.py sobre por
qué se mockea el cliente boto3 directamente en vez de usar moto.
"""
import json
from unittest.mock import patch

from handlers.auth import verify as auth_verify


def test_auth_verify_requires_fields():
    resp = auth_verify.handler({"body": json.dumps({"phone": "+34612345678"})}, None)
    assert resp["statusCode"] == 400


@patch("handlers.auth.verify._cognito")
def test_auth_verify_returns_tokens_without_name(mock_cognito, monkeypatch):
    monkeypatch.setenv("USER_POOL_ID", "pool-123")
    monkeypatch.setenv("USER_POOL_CLIENT_ID", "client-123")

    mock_cognito.admin_respond_to_auth_challenge.return_value = {
        "AuthenticationResult": {
            "IdToken": "id-token",
            "AccessToken": "access-token",
            "RefreshToken": "refresh-token",
        }
    }

    resp = auth_verify.handler(
        {
            "body": json.dumps(
                {"phone": "+34612345678", "code": "123456", "session": "session-token"}
            )
        },
        None,
    )

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["idToken"] == "id-token"
    mock_cognito.admin_get_user.assert_not_called()


@patch("handlers.auth.verify.users_table")
@patch("handlers.auth.verify._cognito")
def test_auth_verify_creates_profile_when_name_present(mock_cognito, mock_users_table, monkeypatch):
    monkeypatch.setenv("USER_POOL_ID", "pool-123")
    monkeypatch.setenv("USER_POOL_CLIENT_ID", "client-123")

    mock_cognito.admin_respond_to_auth_challenge.return_value = {
        "AuthenticationResult": {"IdToken": "id-token", "AccessToken": "a", "RefreshToken": "r"}
    }
    mock_cognito.admin_get_user.return_value = {
        "UserAttributes": [{"Name": "sub", "Value": "user-xyz"}]
    }

    resp = auth_verify.handler(
        {
            "body": json.dumps(
                {
                    "phone": "+34612345678",
                    "code": "123456",
                    "session": "session-token",
                    "name": "Marta G.",
                    "municipalityId": "almunecar",
                }
            )
        },
        None,
    )

    assert resp["statusCode"] == 200
    mock_users_table.return_value.put_item.assert_called_once()
    put_item_kwargs = mock_users_table.return_value.put_item.call_args.kwargs
    assert put_item_kwargs["Item"]["name"] == "Marta G."
    assert put_item_kwargs["Item"]["PK"] == "USER#user-xyz"


@patch("handlers.auth.verify.users_table")
@patch("handlers.auth.verify._cognito")
def test_auth_verify_keeps_existing_profile(mock_cognito, mock_users_table, monkeypatch):
    from botocore.exceptions import ClientError

    monkeypatch.setenv("USER_POOL_ID", "pool-123")
    monkeypatch.setenv("USER_POOL_CLIENT_ID", "client-123")

    mock_cognito.admin_respond_to_auth_challenge.return_value = {
        "AuthenticationResult": {"IdToken": "id-token", "AccessToken": "a", "RefreshToken": "r"}
    }
    mock_cognito.admin_get_user.return_value = {
        "UserAttributes": [{"Name": "sub", "Value": "operator-1"}]
    }
    mock_users_table.return_value.put_item.side_effect = ClientError(
        {"Error": {"Code": "ConditionalCheckFailedException", "Message": "exists"}}, "PutItem"
    )

    resp = auth_verify.handler(
        {
            "body": json.dumps(
                {"phone": "+34612345678", "code": "123456", "session": "s", "name": "Operario"}
            )
        },
        None,
    )

    assert resp["statusCode"] == 200
    put_item_kwargs = mock_users_table.return_value.put_item.call_args.kwargs
    assert put_item_kwargs["ConditionExpression"] == "attribute_not_exists(PK)"
