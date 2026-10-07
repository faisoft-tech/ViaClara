"""POST /auth/start — inicia el login/registro passwordless por teléfono.

Da de alta el usuario en Cognito si es la primera vez que se ve ese número
(sin contraseña, `MessageAction=SUPPRESS` para no disparar el email/SMS de
bienvenida por defecto), y en cualquier caso arranca el reto SMS_OTP nativo
(`AdminInitiateAuth` con `AuthFlow=USER_AUTH`), que es quien realmente envía
el SMS. Unifica alta y login detrás de la misma llamada, para que el cliente
(la app) no tenga que distinguir "soy nuevo" de "ya tengo cuenta" en este paso
— la distinción solo importa después, en /auth/verify, para pedir el nombre
público o no.
"""
import json
import os

import boto3
from botocore.exceptions import ClientError

from lib.response import error_response, json_response

_cognito = boto3.client("cognito-idp")


def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    phone = (body.get("phone") or "").strip()
    if not phone.startswith("+"):
        return error_response(400, "phone must be in E.164 format, e.g. +34612345678")

    user_pool_id = os.environ["USER_POOL_ID"]
    client_id = os.environ["USER_POOL_CLIENT_ID"]

    try:
        _cognito.admin_get_user(UserPoolId=user_pool_id, Username=phone)
    except _cognito.exceptions.UserNotFoundException:
        _cognito.admin_create_user(
            UserPoolId=user_pool_id,
            Username=phone,
            UserAttributes=[
                {"Name": "phone_number", "Value": phone},
                {"Name": "phone_number_verified", "Value": "true"},
            ],
            MessageAction="SUPPRESS",
        )
        # Todo ciudadano nuevo entra en "citizens" (§13); operarios/administradores
        # se dan de alta aparte vía POST /users (handlers/users/create.py).
        _cognito.admin_add_user_to_group(UserPoolId=user_pool_id, Username=phone, GroupName="citizens")

    try:
        auth_resp = _cognito.admin_initiate_auth(
            UserPoolId=user_pool_id,
            ClientId=client_id,
            AuthFlow="USER_AUTH",
            AuthParameters={"USERNAME": phone, "PREFERRED_CHALLENGE": "SMS_OTP"},
        )
    except ClientError as exc:
        print(f"admin_initiate_auth failed: {exc}")
        return error_response(400, "Could not start authentication")

    return json_response(
        200,
        {
            "session": auth_resp.get("Session"),
            "challengeName": auth_resp.get("ChallengeName"),
        },
    )
