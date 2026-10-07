"""Incident photos stored in S3 (see infra/photos.tf).

Keys always look like `photos/<userId>/<uuid>.<ext>`: the user id scopes
every upload to its owner, so POST /incidents can reject keys uploaded by
someone else.
"""
from __future__ import annotations

import os

MAX_PHOTOS_PER_INCIDENT = 3
MAX_PHOTO_BYTES = 5 * 1024 * 1024
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}


def user_prefix(user_id: str) -> str:
    return f"photos/{user_id}/"


def photo_url(key: str) -> str:
    # PHOTOS_BASE_URL already ends in "/photos" (the CloudFront path).
    return f"{os.environ['PHOTOS_BASE_URL']}/{key.removeprefix('photos/')}"


def parse_photo_keys(raw, user_id: str) -> list[str] | None:
    """Validated list of keys owned by `user_id`, or None if invalid."""
    if raw is None:
        return []
    if not isinstance(raw, list) or len(raw) > MAX_PHOTOS_PER_INCIDENT:
        return None
    prefix = user_prefix(user_id)
    keys = []
    for key in raw:
        if not isinstance(key, str) or not key.startswith(prefix) or "/" in key[len(prefix):] or ".." in key:
            return None
        keys.append(key)
    return keys
