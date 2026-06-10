#!/bin/bash
# Deploy VoxEra on EC2 — pull images from Docker Hub
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/voxera}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
DOCKER_USERNAME="${DOCKER_USERNAME:?DOCKER_USERNAME is required}"
DOCKERHUB_TOKEN="${DOCKERHUB_TOKEN:?DOCKERHUB_TOKEN is required}"
DOCKER_FRONTEND_REPO="${DOCKER_FRONTEND_REPO:-voxera-frontend}"
DOCKER_BACKEND_REPO="${DOCKER_BACKEND_REPO:-voxera-backend}"
JWT_SECRET="${JWT_SECRET:?JWT_SECRET is required}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
PUBLIC_HOST="${PUBLIC_HOST:?PUBLIC_HOST is required}"
ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-$PUBLIC_HOST}"
SIP_AOR_1001="1001@${ASTERISK_EXTERNAL_IP}"

POSTGRES_DB="${POSTGRES_DB:-voxera}"
POSTGRES_USER="${POSTGRES_USER:-voxera}"
ENCODED_PASSWORD="$(POSTGRES_PASSWORD="$POSTGRES_PASSWORD" python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["POSTGRES_PASSWORD"], safe=""))')"
DATABASE_URL="${DATABASE_URL:-postgres://${POSTGRES_USER}:${ENCODED_PASSWORD}@postgres:5432/${POSTGRES_DB}}"

mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "Using GitHub secrets: JWT_SECRET=${JWT_SECRET:+set} POSTGRES_PASSWORD=${POSTGRES_PASSWORD:+set} PUBLIC_HOST=${PUBLIC_HOST:+set} ASTERISK_EXTERNAL_IP=${ASTERISK_EXTERNAL_IP:+set}"

# Write .env safely (handles special characters in secrets)
APP_DIR="$APP_DIR" \
PUBLIC_HOST="$PUBLIC_HOST" \
ASTERISK_EXTERNAL_IP="$ASTERISK_EXTERNAL_IP" \
JWT_SECRET="$JWT_SECRET" \
POSTGRES_DB="$POSTGRES_DB" \
POSTGRES_USER="$POSTGRES_USER" \
POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
DATABASE_URL="$DATABASE_URL" \
DOCKER_USERNAME="$DOCKER_USERNAME" \
DOCKER_FRONTEND_REPO="$DOCKER_FRONTEND_REPO" \
DOCKER_BACKEND_REPO="$DOCKER_BACKEND_REPO" \
IMAGE_TAG="$IMAGE_TAG" \
python3 - <<'PY'
import os
from pathlib import Path

def quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'

env = {
    "PUBLIC_HOST": os.environ["PUBLIC_HOST"],
    "ASTERISK_EXTERNAL_IP": os.environ["ASTERISK_EXTERNAL_IP"],
    "PORT": "5000",
    "JWT_SECRET": os.environ["JWT_SECRET"],
    "POSTGRES_DB": os.environ["POSTGRES_DB"],
    "POSTGRES_USER": os.environ["POSTGRES_USER"],
    "POSTGRES_PASSWORD": os.environ["POSTGRES_PASSWORD"],
    "DATABASE_URL": os.environ["DATABASE_URL"],
    "ASTERISK_HOST": "asterisk",
    "ASTERISK_PORT": "8089",
    "ASTERISK_WSS_PORT": "8089",
    "DOCKER_USERNAME": os.environ["DOCKER_USERNAME"],
    "DOCKER_FRONTEND_REPO": os.environ["DOCKER_FRONTEND_REPO"],
    "DOCKER_BACKEND_REPO": os.environ["DOCKER_BACKEND_REPO"],
    "IMAGE_TAG": os.environ["IMAGE_TAG"],
}

path = Path(os.environ["APP_DIR"]) / ".env"
path.write_text("\n".join(f"{k}={quote(v)}" for k, v in env.items()) + "\n")
PY
chmod 600 "$APP_DIR/.env"

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1; then
  if sudo docker info &>/dev/null 2>&1; then
    DOCKER=(sudo docker)
  else
    echo "Docker is not installed or not running. Run scripts/bootstrap-ec2.sh first."
    exit 1
  fi
fi

echo "$DOCKERHUB_TOKEN" | "${DOCKER[@]}" login --username "$DOCKER_USERNAME" --password-stdin

export DOCKER_USERNAME DOCKER_FRONTEND_REPO DOCKER_BACKEND_REPO IMAGE_TAG

if "${DOCKER[@]}" compose version &>/dev/null 2>&1; then
  COMPOSE=("${DOCKER[@]}" compose)
elif command -v docker-compose &>/dev/null; then
  if [ "${DOCKER[0]}" = "sudo" ]; then
    COMPOSE=(sudo docker-compose)
  else
    COMPOSE=(docker-compose)
  fi
else
  echo "Docker Compose not found. Run scripts/bootstrap-ec2.sh first."
  exit 1
fi

# Retry docker exec — Asterisk restart/healthcheck can briefly return HTTP 409.
docker_exec_asterisk() {
  local attempt out
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if ! out="$("${DOCKER[@]}" exec voxera-asterisk "$@" 2>&1)"; then
      out="${out:-}"
    fi
    if ! printf '%s' "$out" | grep -qiE 'unable to upgrade to tcp|received 409|container.*is restarting|is not running|OCI runtime exec failed'; then
      printf '%s' "$out"
      return 0
    fi
    sleep 3
  done
  printf '%s' "$out"
  return 1
}

# True when CLI output looks like a loaded PJSIP object (not empty / not a docker error).
pjsip_cli_ok() {
  local out="$1"
  [ -n "$out" ] \
    && ! printf '%s' "$out" | grep -qi 'Unable to find' \
    && ! printf '%s' "$out" | grep -qiE 'unable to upgrade to tcp|received 409|Error response|is not running|Unable to connect' \
    && ! printf '%s' "$out" | grep -qi 'No objects found'
}

echo "[deploy] Pulling app images..."
time "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml pull backend frontend postgres

# Asterisk config is baked into the image (no host volume mounts). Rebuild every deploy.
echo "[deploy] Rebuilding Asterisk image (CONFIG_REVISION=${IMAGE_TAG})..."
time "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml build \
  --build-arg "CONFIG_REVISION=${IMAGE_TAG}" asterisk

echo "[deploy] Starting containers (recreate asterisk + frontend)..."
if ! time "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml up -d --remove-orphans --force-recreate asterisk frontend; then
  echo "=== asterisk/frontend recreate failed ==="
  exit 1
fi
if ! time "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml up -d --remove-orphans; then
  echo "=== docker compose up failed ==="
  "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps -a || true
  for c in voxera-backend voxera-frontend voxera-postgres voxera-asterisk; do
    echo "=== logs: $c ==="
    "${DOCKER[@]}" logs "$c" --tail 80 2>&1 || true
  done
  exit 1
fi

echo "Waiting for backend health..."
for i in $(seq 1 30); do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    echo "Backend healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "=== Health check timed out ==="
    "${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps -a || true
    for c in voxera-backend voxera-frontend voxera-postgres voxera-asterisk; do
      echo "=== logs: $c ==="
      "${DOCKER[@]}" logs "$c" --tail 80 2>&1 || true
    done
    exit 1
  fi
  sleep 2
done

curl -fsS http://localhost/api/health
echo ""

echo "[deploy] Verifying Socket.IO through nginx..."
if curl -fsS "http://localhost/socket.io/?EIO=4&transport=polling" | grep -q '"sid"'; then
  echo "[deploy] OK: Socket.IO handshake via /socket.io/"
else
  echo "[deploy] WARNING: Socket.IO handshake failed — check nginx/nginx.conf mount and backend logs"
  "${DOCKER[@]}" logs voxera-frontend --tail 30 2>&1 || true
  "${DOCKER[@]}" logs voxera-backend --tail 30 2>&1 || true
fi

"${COMPOSE[@]}" --env-file "$APP_DIR/.env" -f docker-compose.prod.yml ps

if ! "${DOCKER[@]}" ps --format '{{.Names}}' | grep -qx 'voxera-asterisk'; then
  echo "=== FAIL: voxera-asterisk container is not running ==="
  "${DOCKER[@]}" ps -a --filter name=voxera-asterisk || true
  "${DOCKER[@]}" logs voxera-asterisk --tail 100 2>&1 || true
  exit 1
fi

echo "Waiting for Asterisk PJSIP 1001 (AOR ${SIP_AOR_1001})..."
AOR_OUT=""
EP_OUT=""
TP_OUT=""
AST_HEALTH="starting"
AST_UPTIME=""
AST_RESTARTS=0
for i in $(seq 1 60); do
  AST_HEALTH="$("${DOCKER[@]}" inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' voxera-asterisk 2>/dev/null || echo "missing")"
  AST_UPTIME="$("${DOCKER[@]}" inspect --format='{{.State.Status}} started={{.State.StartedAt}}' voxera-asterisk 2>/dev/null || echo "missing")"
  AST_RESTARTS="$("${DOCKER[@]}" inspect --format='{{.RestartCount}}' voxera-asterisk 2>/dev/null || echo 0)"

  if [ "${AST_RESTARTS:-0}" -gt 3 ]; then
    echo "=== Asterisk crash-loop (${AST_RESTARTS} restarts) — container never stays up ==="
    "${DOCKER[@]}" logs voxera-asterisk --tail 80 2>&1 || true
    exit 1
  fi

  AOR_OUT="$(docker_exec_asterisk asterisk -rx "pjsip show aor ${SIP_AOR_1001}" || true)"
  EP_OUT="$(docker_exec_asterisk asterisk -rx "pjsip show endpoint 1001" || true)"
  TP_OUT="$(docker_exec_asterisk asterisk -rx "pjsip show transport transport-wss" || true)"
  if pjsip_cli_ok "$AOR_OUT" && printf '%s' "$AOR_OUT" | grep -q "${SIP_AOR_1001}" \
    && pjsip_cli_ok "$EP_OUT" && printf '%s' "$EP_OUT" | grep -q 'Endpoint:  1001' \
    && pjsip_cli_ok "$TP_OUT" && printf '%s' "$TP_OUT" | grep -q 'transport-wss'; then
    echo "Asterisk PJSIP ready (docker health=${AST_HEALTH})"
    break
  fi

  if [ "$i" -eq 60 ]; then
    echo "=== Asterisk PJSIP not ready (docker health: ${AST_HEALTH}) ==="
    echo "Container: ${AST_UPTIME} restarts=${AST_RESTARTS}"
    "${DOCKER[@]}" inspect voxera-asterisk --format='{{range .State.Health.Log}}{{.Output}}{{end}}' 2>/dev/null | tail -8 || true
    "${DOCKER[@]}" logs voxera-asterisk --tail 200 2>&1 || true
    docker_exec_asterisk cat /etc/asterisk/pjsip.conf 2>/dev/null | head -40 || true
    echo "--- pjsip show aor ${SIP_AOR_1001} ---"
    printf '%s\n' "$AOR_OUT"
    echo "--- pjsip show endpoint 1001 ---"
    printf '%s\n' "$EP_OUT"
    echo "--- pjsip show transport transport-wss ---"
    printf '%s\n' "$TP_OUT"
    docker_exec_asterisk asterisk -rx "pjsip show aors" || true
    docker_exec_asterisk asterisk -rx "pjsip show endpoints" || true
    docker_exec_asterisk asterisk -rx "module show like res_pjsip" || true
    exit 1
  fi

  if [ $((i % 10)) -eq 0 ]; then
    echo "  ... still waiting (${i}/60, health=${AST_HEALTH}, restarts=${AST_RESTARTS})"
    if [ -n "$AOR_OUT" ]; then
      printf '      aor: %s\n' "$(printf '%s' "$AOR_OUT" | head -1)"
    fi
    if [ -n "$EP_OUT" ]; then
      printf '      ep:  %s\n' "$(printf '%s' "$EP_OUT" | head -1)"
    fi
  fi
  sleep 3
done

echo "[deploy] Verifying Asterisk PJSIP runtime..."
if ! pjsip_cli_ok "$AOR_OUT" || ! printf '%s' "$AOR_OUT" | grep -q "${SIP_AOR_1001}" \
  || ! pjsip_cli_ok "$EP_OUT" || ! printf '%s' "$EP_OUT" | grep -q 'Endpoint:  1001' \
  || ! pjsip_cli_ok "$TP_OUT" || ! printf '%s' "$TP_OUT" | grep -q 'transport-wss'; then
  echo "[deploy] FAIL: pjsip endpoint 1001 / AOR ${SIP_AOR_1001} / transport-wss not loaded"
  printf '%s\n' "$AOR_OUT"
  printf '%s\n' "$EP_OUT"
  printf '%s\n' "$TP_OUT"
  exit 1
fi

# Realm: prefer live endpoint/global state, then config file.
SIP_REALM="$(printf '%s' "$EP_OUT" | tr -d '\r' | sed -n 's/.*from_domain[[:space:]]*:[[:space:]]*\([^[:space:]]*\).*/\1/p' | head -1)"
if [ -z "$SIP_REALM" ]; then
  GLOBAL_OUT="$(docker_exec_asterisk asterisk -rx "pjsip show global" || true)"
  SIP_REALM="$(printf '%s' "$GLOBAL_OUT" | tr -d '\r' | sed -n 's/.*default_realm[[:space:]]*:[[:space:]]*\([^[:space:]]*\).*/\1/p' | head -1)"
fi
if [ -z "$SIP_REALM" ]; then
  SIP_REALM="$("${DOCKER[@]}" exec voxera-asterisk cat /etc/asterisk/pjsip.conf 2>/dev/null | tr -d '\r' | sed -n 's/^default_realm=//p' | head -1 || true)"
fi
echo "[deploy] SIP realm/from_domain: ${SIP_REALM}"
if [ -z "$SIP_REALM" ] || [ "$SIP_REALM" = "127.0.0.1" ]; then
  echo "[deploy] FAIL: SIP realm must be your public IP — check PUBLIC_HOST / ASTERISK_EXTERNAL_IP secrets"
  docker_exec_asterisk env 2>/dev/null | grep -E '^(PUBLIC_HOST|ASTERISK_EXTERNAL_IP)=' || true
  exit 1
fi
if [ "$SIP_REALM" != "$PUBLIC_HOST" ] && [ -n "$ASTERISK_EXTERNAL_IP" ] && [ "$SIP_REALM" != "$ASTERISK_EXTERNAL_IP" ]; then
  echo "[deploy] WARNING: SIP realm (${SIP_REALM}) differs from PUBLIC_HOST (${PUBLIC_HOST})"
fi

CHAN_SIP_OUT="$(docker_exec_asterisk asterisk -rx "module show like chan_sip" || true)"
if printf '%s' "$CHAN_SIP_OUT" | grep -q '1 modules loaded'; then
  echo "[deploy] FAIL: chan_sip is loaded — WebSocket REGISTER will 401"
  exit 1
fi
echo "[deploy] OK: pjsip endpoint 1001 + AOR ${SIP_AOR_1001} + transport-wss loaded, chan_sip unloaded, realm=${SIP_REALM}"

echo "[deploy] Verifying Asterisk WebSocket modules (JsSIP needs /ws on :8089)..."
sleep 3
WS_MODULES="$(docker_exec_asterisk asterisk -rx "module show like websocket" || true)"
if ! printf '%s\n' "$WS_MODULES" | grep -q 'res_http_websocket.so'; then
  echo "[deploy] FAIL: res_http_websocket not loaded — ws://host:8089/ws will return 404"
  printf '%s\n' "$WS_MODULES"
  "${DOCKER[@]}" logs voxera-asterisk --tail 60 2>&1 || true
  exit 1
fi
echo "[deploy] OK: res_http_websocket loaded"

WS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  "http://127.0.0.1:${ASTERISK_WSS_PORT:-8089}/ws" 2>/dev/null || echo 000)"
if [ "$WS_CODE" = "404" ]; then
  echo "[deploy] FAIL: Asterisk /ws returned HTTP 404 — WebSocket SIP cannot connect"
  exit 1
fi
echo "[deploy] OK: WebSocket endpoint /ws is registered (HTTP $WS_CODE)"
