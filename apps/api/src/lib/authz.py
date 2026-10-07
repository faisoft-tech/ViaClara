"""Lectura de identidad/rol a partir de los claims JWT que ya validó el
authorizer de API Gateway (evento `requestContext.authorizer.jwt.claims`).

TODO / a verificar con una cuenta real: el formato exacto de `cognito:groups`
en un evento de API Gateway HTTP API con authorizer JWT — puede llegar como
lista real o como string (p.ej. "[operators]"), según versión/formato del
evento. Aquí se manejan ambos casos por robustez, pero no se ha podido
confirmar contra un token real todavía.
"""
from __future__ import annotations

from lib.models import Role


def get_claims(event: dict) -> dict:
    return event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})


def get_user_id(event: dict) -> str | None:
    return get_claims(event).get("sub")


def get_role(event: dict) -> Role:
    groups_raw = get_claims(event).get("cognito:groups") or []
    if isinstance(groups_raw, str):
        groups = [g.strip() for g in groups_raw.strip("[]").split(",") if g.strip()]
    else:
        groups = list(groups_raw)

    if "administrators" in groups:
        return "administrator"
    if "operators" in groups:
        return "operator"
    return "citizen"


def is_staff(event: dict) -> bool:
    return get_role(event) in ("operator", "administrator")
