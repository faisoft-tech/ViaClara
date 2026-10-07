"""Tests de handlers.users.create — igual que test_auth_start.py, mockeamos
el cliente boto3 de Cognito directamente en vez de usar moto (mismo motivo:
soporte incompleto de moto para operaciones admin-* recientes)."""
import json
from unittest.mock import patch

from handlers.users import create as users_create


@patch("handlers.users.create._cognito")
def test_administrator_creates_operator(mock_cognito, monkeypatch, dynamodb_tables):
    monkeypatch.setenv("USER_POOL_ID", "pool-123")
    mock_cognito.admin_create_user.return_value = {
        "User": {"Attributes": [{"Name": "sub", "Value": "new-user-id"}]}
    }

    resp = users_create.handler(
        {
            "body": json.dumps({"email": "Operario@Almunecar.es", "name": "Operario 1", "role": "operator"}),
            "requestContext": {
                "authorizer": {"jwt": {"claims": {"sub": "admin-1", "cognito:groups": "[administrators]"}}}
            },
        },
        None,
    )

    assert resp["statusCode"] == 201
    mock_cognito.admin_add_user_to_group.assert_called_once_with(
        UserPoolId="pool-123", Username="operario@almunecar.es", GroupName="operators"
    )
    create_kwargs = mock_cognito.admin_create_user.call_args.kwargs
    assert create_kwargs["DesiredDeliveryMediums"] == ["EMAIL"]
    assert len(create_kwargs["TemporaryPassword"]) >= 8
    body = json.loads(resp["body"])
    assert body["role"] == "operator"
    assert body["email"] == "operario@almunecar.es"


def test_non_administrator_forbidden(dynamodb_tables):
    resp = users_create.handler(
        {
            "body": json.dumps({"email": "x@y.es", "name": "x", "role": "operator"}),
            "requestContext": {"authorizer": {"jwt": {"claims": {"sub": "citizen-1"}}}},
        },
        None,
    )
    assert resp["statusCode"] == 403
