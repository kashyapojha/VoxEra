#!/bin/bash
# Build frontend FROM THIS REPO on EC2 (includes all SIP UI fixes — Docker Hub image does not).
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

# shellcheck disable=SC1090
set -a && . "$ENV_FILE" && set +a

IP="${ASTERISK_EXTERNAL_IP:-${PUBLIC_HOST:-127.0.0.1}}"
export VITE_API_URL="${VITE_API_URL:-}"
export VITE_SIP_WS_URL="${VITE_SIP_WS_URL:-ws://${IP}:8089/ws}"
export VITE_SIP_URI="${VITE_SIP_URI:-sip:1001@${IP}}"
export VITE_SIP_PASSWORD="${VITE_SIP_PASSWORD:-1001}"
export VITE_SIP_DEBUG="${VITE_SIP_DEBUG:-true}"

echo "=== Building frontend from repo (SIP fixes) ==="
echo "  VITE_SIP_WS_URL=$VITE_SIP_WS_URL"
echo "  VITE_SIP_URI=$VITE_SIP_URI (default ext — use Softphone to register 1001 or 1002)"

"${COMPOSE[@]}" --env-file "$ENV_FILE" -f docker-compose.prod.yml build --no-cache frontend

echo "=== Recreating voxera-frontend ==="
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --force-recreate frontend

echo ""
echo "OK: Frontend rebuilt. Hard-refresh browsers (Ctrl+Shift+R)."
echo "Verify in browser console: [SIP] VoxEra sipService"
echo "Then: bash scripts/rebuild-asterisk-ec2.sh  (if dialplan check fails)"
echo "Then: bash scripts/debug-sip-call.sh"
