"""POST /auth/verify — completa el login/registro verificando el código SMS.

Si `name` viene en el body (alta nueva, tras el paso "¿Cómo quieres que te
llamen?" de la app), crea el perfil inicial en la tabla `users`. Si no viene
(login de un usuario que ya tenía nombre guardado), solo devuelve los tokens.

TODO / a verificar con una cuenta real: el nombre exacto del parámetro de
`ChallengeResponses` para el reto `SMS_OTP` del flujo `USER_AUTH` (aquí se usa
`SMS_OTP_CODE` por analogía con `SOFTWARE_TOKEN_MFA_CODE` de MFA, pero es una
API relativamente nueva y no he podido confirmarlo contra la documentación
oficial más reciente ni contra una llamada real). Revisar la respuesta de
`AdminInitiateAuth` (que en general disponibiliza el nombre del `ChallengeName`
esperado) y ajustar aquí si el nombre real difiere.
"""
import json
import os
import time

import boto3
from botocore.exceptions import ClientError

from lib.dynamo import users_table
from lib.response import error_response, json_response

_cognito = boto3.client("cognito-idp")


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    phone = (body.get("phone") or "").strip()
    code = (body.get("code") or "").strip()
    session = body.get("session")
    name = (body.get("name") or "").strip() or None
    default_municipality_id = body.get("municipalityId")

    if not phone or not code or not session:
        return error_response(400, "phone, code and session are required")

    user_pool_id = os.environ["USER_POOL_ID"]
    client_id = os.environ["USER_POOL_CLIENT_ID"]

    try:
        resp = _cognito.admin_respond_to_auth_challenge(
            UserPoolId=user_pool_id,
            ClientId=client_id,
            ChallengeName="SMS_OTP",
            Session=session,
            ChallengeResponses={"USERNAME": phone, "SMS_OTP_CODE": code},
        )
    except ClientError as exc:
        print(f"admin_respond_to_auth_challenge failed: {exc}")
        return error_response(401, "Invalid or expired code")

    if name:
        user_info = _cognito.admin_get_user(UserPoolId=user_pool_id, Username=phone)
        user_id = next(
            (a["Value"] for a in user_info.get("UserAttributes", []) if a["Name"] == "sub"),
            None,
        )
        if user_id:
            try:
                # Never overwrite an existing profile: a staff member logging in
                # with `name` would otherwise be downgraded to role "citizen".
                users_table().put_item(
                    Item={
                        "PK": f"USER#{user_id}",
                        "SK": "PROFILE",
                        "id": user_id,
                        "name": name,
                        "phone": phone,
                        "role": "citizen",
                        "defaultMunicipalityId": default_municipality_id,
                        "createdAt": int(time.time() * 1000),
                    },
                    ConditionExpression="attribute_not_exists(PK)",
                )
            except ClientError as exc:
                if exc.response["Error"]["Code"] != "ConditionalCheckFailedException":
                    raise

    tokens = resp.get("AuthenticationResult", {}) or {}
    return json_response(
        200,
        {
            "idToken": tokens.get("IdToken"),
            "accessToken": tokens.get("AccessToken"),
            "refreshToken": tokens.get("RefreshToken"),
        },
    )
