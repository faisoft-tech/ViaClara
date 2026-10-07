"""Acceso a las tablas DynamoDB (ver infra/dynamodb.tf para el esquema).

Los recursos boto3 se crean de forma perezosa (dentro de una función, no a
nivel de módulo) para que los tests con `moto` puedan interceptarlos: un
`boto3.resource(...)` creado en el momento del `import` del módulo se
ejecutaría ANTES de entrar en el contexto `mock_aws()` de un test y se
saltaría el mock.
"""
import os

import boto3


def _dynamodb():
    return boto3.resource("dynamodb")


def incidents_table():
    return _dynamodb().Table(os.environ["TABLE_INCIDENTS"])


def users_table():
    return _dynamodb().Table(os.environ["TABLE_USERS"])


def municipalities_table():
    return _dynamodb().Table(os.environ["TABLE_MUNICIPALITIES"])
