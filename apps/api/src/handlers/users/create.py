"""POST /users — alta de operarios/administradores desde la admin app (solo
administrador — §13 "Gestionar usuarios"). Distinto de POST /auth/start, que
es el alta de ciudadanos por teléfono: el personal municipal entra con su
correo y contraseña. Cognito le envía por email una contraseña temporal que
la admin app le obliga a cambiar en el primer login (NEW_PASSWORD_REQUIRED).
"""
import json
import os
import secrets
import time

import boto3
from botocore.exceptions import ClientError

from lib.authz import get_role
from lib.dynamo import users_table
from lib.response import error_response, json_response

_cognito = boto3.client("cognito-idp")

_ROLE_TO_GROUP = {"operator": "operators", "administrator": "administrators"}


def _temporary_password() -> str:
    # Suffix guarantees the default policy's upper/lower/digit/symbol classes.
    return secrets.token_urlsafe(12) + "Aa1!"


def handler(event, context):
    if get_role(event) != "administrator":
        return error_response(403, "Only administrators can create users")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    email = (body.get("email") or "").strip().lower()
    name = (body.get("name") or "").strip()
    role = body.get("role")

    if "@" not in email or not name or role not in _ROLE_TO_GROUP:
        return error_response(400, "email, name and role ('operator'|'administrator') are required")

    user_pool_id = os.environ["USER_POOL_ID"]

    try:
        created = _cognito.admin_create_user(
            UserPoolId=user_pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
            ],
            # Cognito rejects users with neither a phone nor a password
            # (USER_MISSING_ALLOWED_FIRST_AUTH_FACTOR); this one is emailed in
            # the invitation and must be changed on first login.
            TemporaryPassword=_temporary_password(),
            DesiredDeliveryMediums=["EMAIL"],
        )
    except _cognito.exceptions.UsernameExistsException:
        return error_response(409, "A user with this email already exists")
    except ClientError as exc:
        print(f"admin_create_user failed: {exc}")
        return error_response(400, "Could not create user")

    user_id = next(a["Value"] for a in created["User"]["Attributes"] if a["Name"] == "sub")

    _cognito.admin_add_user_to_group(UserPoolId=user_pool_id, Username=email, GroupName=_ROLE_TO_GROUP[role])

    users_table().put_item(
        Item={
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "defaultMunicipalityId": body.get("municipalityId"),
            "createdAt": int(time.time() * 1000),
        }
    )

    return json_response(201, {"id": user_id, "name": name, "email": email, "role": role})
