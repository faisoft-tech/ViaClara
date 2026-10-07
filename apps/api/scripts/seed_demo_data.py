"""Seed the demo incidents (demo_incidents.json) and their photos
(demo_photos/) into AWS, using the same item layout the Lambdas write (see
handlers/incidents/create.py and handlers/comments/create.py).

Dates are relative ("daysAgo") so the demo always looks recent. Every run
first removes all previously seeded incidents (createdBy = "seed-*") from
the seeded municipalities, so re-running resets the demo to its initial
state and drops ids that no longer exist in the JSON.

Usage (from apps/api, credentials for the ViaClara account in the env):
    python scripts/seed_demo_data.py [--env dev]
Photo bucket and base URL default to `terraform output` in ../../infra.
"""
import argparse
import json
import re
import subprocess
import time
import unicodedata
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Attr, Key

SCRIPTS_DIR = Path(__file__).parent
INFRA_DIR = SCRIPTS_DIR.parents[2] / "infra"
PHOTOS_DIR = SCRIPTS_DIR / "demo_photos"
SEED_PHOTO_PREFIX = "photos/seed/"
DAY_MS = 86_400_000


def _terraform_output(name: str) -> str:
    result = subprocess.run(
        ["terraform", f"-chdir={INFRA_DIR}", "output", "-raw", name],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _seed_user_id(name: str) -> str:
    slug = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    return "seed-" + re.sub(r"[^a-z0-9]+", "-", slug).strip("-")


def build_items(incident: dict, now_ms: int, photos_base_url: str) -> tuple[list[dict], dict]:
    def ms_ago(days: float) -> int:
        return now_ms - int(days * DAY_MS)

    created_ms = ms_ago(incident["daysAgo"])
    author_id = _seed_user_id(incident["author"])
    likes = incident["likes"]
    watchers = incident["watchers"]
    comments = incident["comments"]
    pk = f"INCIDENT#{incident['id']}"

    metadata = {
        "PK": pk,
        "SK": "METADATA",
        "id": incident["id"],
        "title": incident["title"],
        "category": incident["category"],
        "status": incident["status"],
        "description": incident["description"],
        "address": incident["address"],
        "lat": Decimal(str(incident["lat"])),
        "lng": Decimal(str(incident["lng"])),
        "municipalityId": incident["municipalityId"],
        "createdBy": author_id,
        "authorName": incident["author"],
        "createdAt": created_ms,
        "date": _iso(created_ms),
        "likes": likes,
        "watchersCount": watchers,
        "commentsCount": len(comments),
        "priorityScore": Decimal(str(likes * 1 + watchers * 1.5 + len(comments) * 2)),
        "photos": [f"{photos_base_url}/seed/{name}" for name in incident["photos"]],
        "history": [
            {k: v for k, v in {"status": h["status"], "date": _iso(ms_ago(h["daysAgo"])), "note": h.get("note")}.items() if v}
            for h in incident["history"]
        ],
        "GSI1PK": f"MUNICIPALITY#{incident['municipalityId']}",
        "GSI1SK": created_ms,
    }
    if resolution := incident.get("resolution"):
        metadata["resolution"] = {"note": resolution["note"], "date": _iso(ms_ago(resolution["daysAgo"]))}
    if verification := incident.get("verification"):
        metadata["verification"] = {"result": verification["result"], "date": _iso(ms_ago(verification["daysAgo"]))}

    items = [metadata]
    for i, c in enumerate(comments, start=1):
        comment_ms = ms_ago(c["daysAgo"])
        comment_id = f"c{i}"
        items.append(
            {
                "PK": pk,
                "SK": f"COMMENT#{comment_ms}#{comment_id}",
                "id": comment_id,
                "authorId": _seed_user_id(c["author"]),
                "author": c["author"],
                "text": c["text"],
                "date": _iso(comment_ms),
                "isMunicipality": bool(c.get("isMunicipality")),
                "likes": c.get("likes", 0),
            }
        )

    mirror = {
        "PK": f"USER#{author_id}",
        "SK": f"INCIDENT#{created_ms}#{incident['id']}",
        "incidentId": incident["id"],
        "title": incident["title"],
        "category": incident["category"],
        "status": incident["status"],
        "address": incident["address"],
        "municipalityId": incident["municipalityId"],
        "date": metadata["date"],
        "createdAt": created_ms,
    }
    return items, mirror


def purge_seeded(incidents_table, users_table, municipality_ids: set[str]) -> int:
    removed = 0
    for municipality_id in sorted(municipality_ids):
        query = {
            "IndexName": "by-municipality",
            "KeyConditionExpression": Key("GSI1PK").eq(f"MUNICIPALITY#{municipality_id}"),
            "FilterExpression": Attr("createdBy").begins_with("seed-"),
        }
        while True:
            page = incidents_table.query(**query)
            for meta in page["Items"]:
                keys = incidents_table.query(
                    KeyConditionExpression=Key("PK").eq(meta["PK"]),
                    ProjectionExpression="PK, SK",
                )["Items"]
                with incidents_table.batch_writer() as batch:
                    for key in keys:
                        batch.delete_item(Key=key)
                users_table.delete_item(
                    Key={"PK": f"USER#{meta['createdBy']}", "SK": f"INCIDENT#{meta['createdAt']}#{meta['id']}"}
                )
                removed += 1
            if "LastEvaluatedKey" not in page:
                break
            query["ExclusiveStartKey"] = page["LastEvaluatedKey"]
    return removed


def upload_photos(bucket: str, names: set[str]) -> None:
    s3 = boto3.client("s3")
    for name in sorted(names):
        s3.upload_file(
            str(PHOTOS_DIR / name),
            bucket,
            f"{SEED_PHOTO_PREFIX}{name}",
            ExtraArgs={"ContentType": "image/jpeg", "CacheControl": "public, max-age=86400"},
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", default="dev")
    parser.add_argument("--project", default="viaclara")
    parser.add_argument("--photos-bucket")
    parser.add_argument("--photos-base-url")
    args = parser.parse_args()

    photos_bucket = args.photos_bucket or _terraform_output("photos_bucket")
    photos_base_url = (args.photos_base_url or _terraform_output("photos_base_url")).rstrip("/")

    dynamodb = boto3.resource("dynamodb")
    incidents_table = dynamodb.Table(f"{args.project}-{args.env}-incidents")
    users_table = dynamodb.Table(f"{args.project}-{args.env}-users")

    incidents = json.loads((SCRIPTS_DIR / "demo_incidents.json").read_text(encoding="utf-8"))
    photo_names = {name for incident in incidents for name in incident["photos"]}
    missing = [name for name in photo_names if not (PHOTOS_DIR / name).is_file()]
    if missing:
        raise SystemExit(f"missing photos in {PHOTOS_DIR}: {', '.join(sorted(missing))}")

    upload_photos(photos_bucket, photo_names)
    print(f"uploaded {len(photo_names)} photos to s3://{photos_bucket}/{SEED_PHOTO_PREFIX}")

    removed = purge_seeded(incidents_table, users_table, {i["municipalityId"] for i in incidents})
    print(f"removed {removed} previously seeded incidents")

    now_ms = int(time.time() * 1000)
    for incident in incidents:
        items, mirror = build_items(incident, now_ms, photos_base_url)
        with incidents_table.batch_writer() as batch:
            for item in items:
                batch.put_item(Item=item)
        users_table.put_item(Item=mirror)
        print(f"seeded {incident['id']} ({incident['municipalityId']}, {len(items) - 1} comments)")


if __name__ == "__main__":
    main()
