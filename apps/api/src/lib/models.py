"""Enums que reflejan src/theme/tokens.ts.

Los valores (strings) deben coincidir EXACTAMENTE con el frontend — el JSON
que devuelve la API se consume tal cual, sin traducir claves ni valores.
"""
from __future__ import annotations

from typing import Literal

IncidentStatus = Literal["submitted", "open", "in_progress", "resolved", "declined"]
IncidentCategory = Literal["lighting", "road", "cleaning", "furniture", "green_areas", "other"]

INCIDENT_STATUSES: tuple[str, ...] = (
    "submitted",
    "open",
    "in_progress",
    "resolved",
    "declined",
)

INCIDENT_CATEGORIES: tuple[str, ...] = (
    "lighting",
    "road",
    "cleaning",
    "furniture",
    "green_areas",
    "other",
)

Role = Literal["citizen", "operator", "administrator"]
