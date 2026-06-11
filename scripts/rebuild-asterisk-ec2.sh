#!/bin/bash
# Rebuild Asterisk on EC2 — dialplan + PJSIP are generated at container start from docker-entrypoint.sh.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/voxera}"
cd "$APP_DIR"

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

COMPOSE=("${DOCKER[@]}" compose)
if ! "${DOCKER[@]}" compose version &>/dev/null 2>&1; then
  COMPOSE=(docker-compose)
fi

ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE missing — run deploy-ec2.sh first"
  exit 1
fi

echo "=== Building Asterisk from repo (dialplan + PJSIP fixes) ==="
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f docker-compose.prod.yml build --no-cache asterisk

echo "=== Recreating voxera-asterisk ==="
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --force-recreate asterisk

echo "=== Waiting for Asterisk health ==="
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
  if "${DOCKER[@]}" inspect -f '{{.State.Health.Status}}' voxera-asterisk 2>/dev/null | grep -q healthy; then
    echo "OK: Asterisk healthy"
    break
  fi
  sleep 6
done

echo ""
echo "=== Dialplan check (must show _10XX + Dial with r flag) ==="
"${DOCKER[@]}" exec voxera-asterisk asterisk -rx "dialplan show internal" 2>/dev/null | head -12 || true

echo ""
echo "OK: Asterisk rebuilt. Unregister → Register both extensions in the browser, then test 1001 → 1002."
