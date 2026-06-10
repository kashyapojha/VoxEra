#!/bin/bash
# One-shot Asterisk repair on EC2 — rebuild image, recreate container, verify PJSIP + REGISTER path.
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
  echo "ERROR: $ENV_FILE not found — run deploy-ec2.sh first or create .env"
  exit 1
fi

# shellcheck disable=SC1090
set -a && . "$ENV_FILE" && set +a
ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-${PUBLIC_HOST:-127.0.0.1}}"
SIP_AOR_1001="1001@${ASTERISK_EXTERNAL_IP}"

REV="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
echo "=== Rebuilding Asterisk (CONFIG_REVISION=${REV}) ==="
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f docker-compose.prod.yml build \
  --no-cache --build-arg "CONFIG_REVISION=${REV}" asterisk

echo "=== Recreating voxera-asterisk ==="
"${COMPOSE[@]}" --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --force-recreate asterisk

echo "=== Startup logs (must show 'PJSIP ready') ==="
sleep 8
"${DOCKER[@]}" logs voxera-asterisk --tail 80 2>&1 || true

echo "=== Waiting for PJSIP (up to 3 min) ==="
for i in $(seq 1 60); do
  RESTARTS="$("${DOCKER[@]}" inspect --format='{{.RestartCount}}' voxera-asterisk 2>/dev/null || echo 0)"
  if [ "${RESTARTS:-0}" -gt 5 ]; then
    echo "FAIL: container crash-loop (restarts=${RESTARTS})"
    "${DOCKER[@]}" logs voxera-asterisk --tail 120
    exit 1
  fi

  AOR="$("${DOCKER[@]}" exec voxera-asterisk asterisk -rx "pjsip show aor ${SIP_AOR_1001}" 2>&1 || true)"
  EP="$("${DOCKER[@]}" exec voxera-asterisk asterisk -rx "pjsip show endpoint 1001" 2>&1 || true)"
  TP="$("${DOCKER[@]}" exec voxera-asterisk asterisk -rx "pjsip show transport transport-wss" 2>&1 || true)"
  HTTP="$("${DOCKER[@]}" exec voxera-asterisk asterisk -rx "http show status" 2>&1 || true)"

  if printf '%s' "$AOR" | grep -q "${SIP_AOR_1001}" \
    && printf '%s' "$AOR" | grep -qv 'Unable to find' \
    && printf '%s' "$EP" | grep -q 'Endpoint:  1001' \
    && printf '%s' "$TP" | grep -q 'transport-wss' \
    && printf '%s' "$HTTP" | grep -qi 'Enabled'; then
    echo "OK: endpoint 1001 + AOR ${SIP_AOR_1001} + transport-wss + HTTP server"
    echo ""
    echo "Next: open Settings in browser, click Register."
    echo "Expected console: [SIP] Registered — sip:1001@${ASTERISK_EXTERNAL_IP}"
    "${DOCKER[@]}" ps --filter name=voxera-asterisk
    exit 0
  fi

  if [ $((i % 10)) -eq 0 ]; then
    echo "  ... still waiting (${i}/60, restarts=${RESTARTS})"
    printf '  aor: %s\n' "$(printf '%s' "$AOR" | head -1)"
    printf '  ep:  %s\n' "$(printf '%s' "$EP" | head -1)"
    printf '  tp:  %s\n' "$(printf '%s' "$TP" | head -1)"
  fi
  sleep 3
done

echo "FAIL: PJSIP not ready after 3 minutes"
"${DOCKER[@]}" logs voxera-asterisk --tail 150
exit 1
