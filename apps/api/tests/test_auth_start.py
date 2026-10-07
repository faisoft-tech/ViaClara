"""Tests de handlers.auth.start.

No usamos moto aquí: el soporte de moto para el flujo passwordless
USER_AUTH/SMS_OTP de Cognito (una API relativamente nueva) puede estar
incompleto. En su lugar mockeamos directamente el cliente boto3 del módulo,
para verificar la lógica propia (validación, creación condicional del
usuario, forma de la respuesta) sin depender de que moto lo modele bien.
La interacción real contra Cognito solo se podrá confirmar con una cuenta
AWS real — ver apps/api/README.md.
"""
import json
from unittest.mock import patch

from handlers.auth import start as auth_start


class _FakeUserNotFound(Exception):
    pass


def test_auth_start_rejects_non_e164_phone():
    resp = auth_start.handler({"body": json.dumps({"phone": "612345678"})}, None)
    assert resp["statusCode"] == 400


@patch("handlers.auth.start._cognito")
def test_auth_start_creates_new_user_then_initiates_auth(mock_cognito, monkeypatch):
    monkeypatch.setenv("USER_POOL_ID", "pool-123")
    monkeypatch.setenv("USER_POOL_CLIENT_ID", "client-123")

    mock_cognito.exceptions.UserNotFoundException = _FakeUserNotFound
    mock_cognito.admin_get_user.side_effect = _FakeUserNotFound()
    mock_cognito.admin_initiate_auth.return_value = {
        "Session": "session-token",
        "ChallengeName": "SMS_OTP",
    }

    resp = auth_start.handler({"body": json.dumps({"phone": "+34612345678"})}, None)

    assert resp["statusCode"] == 200
    mock_cognito.admin_create_user.assert_called_once()
    mock_cognito.admin_add_user_to_group.assert_called_once_with(
        UserPoolId="pool-123", Username="+34612345678", GroupName="citizens"
    )
    body = json.loads(resp["body"])
    assert body["session"] == "session-token"
    assert body["challengeName"] == "SMS_OTP"


@patch("handlers.auth.start._cognito")
def test_auth_start_existing_user_skips_create(mock_cognito, monkeypatch):
    monkeypatch.setenv("USER_POOL_ID", "pool-123")
    monkeypatch.setenv("USER_POOL_CLIENT_ID", "client-123")

    mock_cognito.exceptions.UserNotFoundException = _FakeUserNotFound
    mock_cognito.admin_get_user.return_value = {"UserAttributes": []}
    mock_cognito.admin_initiate_auth.return_value = {
        "Session": "session-token",
        "ChallengeName": "SMS_OTP",
    }

    resp = auth_start.handler({"body": json.dumps({"phone": "+34612345678"})}, None)

    assert resp["statusCode"] == 200
    mock_cognito.admin_create_user.assert_not_called()
    mock_cognito.admin_add_user_to_group.assert_not_called()
