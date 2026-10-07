"""POST /photos — presigned S3 POST to upload one incident photo.

Body: {"contentType": "image/jpeg"}. The client then sends a multipart POST
to `url` with every entry of `fields` followed by the file, and passes `key`
in the `photos` list of POST /incidents. The policy caps the size and fixes
the content type, and expires in 5 minutes.
"""
import json
import os
import uuid

import boto3
from botocore.config import Config

from lib.authz import get_user_id
from lib.photos import CONTENT_TYPE_EXTENSIONS, MAX_PHOTO_BYTES, photo_url, user_prefix
from lib.response import error_response, json_response

UPLOAD_EXPIRES_SECONDS = 300


def _s3():
    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
    # Regional endpoint: the global one redirects POSTs for new buckets
    # outside us-east-1.
    return boto3.client(
        "s3",
        region_name=region,
        endpoint_url=f"https://s3.{region}.amazonaws.com",
        config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
    )


def handler(event, context):
    user_id = get_user_id(event)
    if not user_id:
        return error_response(401, "Missing authenticated user")

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")

    content_type = body.get("contentType")
    extension = CONTENT_TYPE_EXTENSIONS.get(content_type)
    if not extension:
        return error_response(400, "Unsupported content type")

    key = f"{user_prefix(user_id)}{uuid.uuid4().hex}.{extension}"
    post = _s3().generate_presigned_post(
        Bucket=os.environ["PHOTOS_BUCKET"],
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, MAX_PHOTO_BYTES],
        ],
        ExpiresIn=UPLOAD_EXPIRES_SECONDS,
    )

    return json_response(
        201,
        {"key": key, "url": post["url"], "fields": post["fields"], "photoUrl": photo_url(key)},
    )
