#!/usr/bin/env bash
# Uploads the Android release signing secrets to GitHub Actions with the gh
# CLI. Values are read from the local keystore folder and piped straight into
# `gh secret set`, so they never appear in the terminal or shell history.
#
# Usage: scripts/set-android-secrets.sh [owner/repo]
set -euo pipefail

REPO="${1:-faisoft-tech/ViaClara}"
DIR="${VIACLARA_SIGNING_DIR:-$HOME/.viaclara/android-signing}"
KEYSTORE="$DIR/viaclara-release.jks"
CREDENTIALS="$DIR/credentials.env"

[ -f "$KEYSTORE" ] || { echo "Keystore not found: $KEYSTORE" >&2; exit 1; }
[ -f "$CREDENTIALS" ] || { echo "Credentials not found: $CREDENTIALS" >&2; exit 1; }

base64 -w0 "$KEYSTORE" | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO"
for name in ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD; do
  grep "^$name=" "$CREDENTIALS" | cut -d= -f2- | tr -d '\n' | gh secret set "$name" --repo "$REPO"
done
echo "Secrets set on $REPO"
