#!/bin/bash
# Quick SIP registration diagnostics — run on EC2 or local with Docker.
set -euo pipefail

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1 && sudo docker info &>/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

C="${DOCKER[@]} exec voxera-asterisk"

echo "=== Asterisk container ==="
"${DOCKER[@]}" ps --filter name=voxera-asterisk --format '{{.Names}} {{.Status}}' || true
echo ""

echo "=== pjsip.conf (1001 endpoint) ==="
$C grep -E '^\[1001|^\[1001-auth\]|^type=|^aors=|^auth=|^realm=' /etc/asterisk/pjsip.conf 2>/dev/null || echo "Container not running or pjsip.conf missing"
echo ""

echo "=== chan_sip (must be unloaded — otherwise WebSocket REGISTER hits wrong module) ==="
$C asterisk -rx "module show like chan_sip" 2>/dev/null || true
echo ""

echo "=== WebSocket modules (required for ws://host:8089/ws — 404 means not loaded) ==="
$C asterisk -rx "module show like websocket" 2>&1 || true
echo ""

WS_HOST="${ASTERISK_EXTERNAL_IP:-127.0.0.1}"
WS_PORT="${ASTERISK_WSS_PORT:-8089}"
WS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  "http://${WS_HOST}:${WS_PORT}/ws" 2>/dev/null || echo 000)"
echo "=== /ws HTTP status from host (${WS_HOST}:${WS_PORT}) => ${WS_CODE} (404 = broken) ==="
echo ""

echo "=== PJSIP objects ==="
$C asterisk -rx "pjsip show endpoint 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show aor 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show transport transport-wss" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show auth 1001-auth" 2>/dev/null || true
echo ""

echo "=== Registered contacts ==="
$C asterisk -rx "pjsip show contacts" 2>/dev/null || true
echo ""

ok=1
$C grep -q '^aors=1001$' /etc/asterisk/pjsip.conf 2>/dev/null || ok=0
$C grep -q '^auth=1001-auth$' /etc/asterisk/pjsip.conf 2>/dev/null || ok=0
if $C asterisk -rx "pjsip show aor 1001" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: AOR 1001 not loaded in Asterisk — REGISTER returns 404 or no response"
  ok=0
fi
if $C asterisk -rx "pjsip show endpoint 1001" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: endpoint 1001 not loaded in Asterisk"
  ok=0
fi
if $C asterisk -rx "pjsip show transport transport-wss" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: transport-wss not loaded — WebSocket connects but REGISTER times out"
  ok=0
fi
chan_loaded="$($C asterisk -rx "module show like chan_sip" 2>/dev/null | awk '/modules loaded/ {print $1}' | head -1)"
if [ "${chan_loaded:-0}" != "0" ]; then
  echo "FAIL: chan_sip is loaded — WebSocket REGISTER will 401 against wrong module"
  ok=0
fi
if ! $C asterisk -rx "module show like websocket" 2>&1 | grep -q 'res_http_websocket.so'; then
  echo "FAIL: res_http_websocket not loaded — browser WebSocket to /ws will fail"
  ok=0
fi
if ! $C asterisk -rx "module show like websocket" 2>&1 | grep -q 'res_pjsip_transport_websocket.so'; then
  echo "FAIL: res_pjsip_transport_websocket not loaded — REGISTER gets no SIP response"
  ok=0
fi
if [ "${WS_CODE:-404}" = "404" ]; then
  echo "FAIL: /ws returned HTTP 404 — load res_http_websocket in modules.conf"
  ok=0
fi

if [ "$ok" -eq 1 ]; then
  echo "OK: endpoint 1001 + AOR 1001 + transport-wss + auth 1001-auth configured"
else
  echo "FAIL: config mismatch — need [1001] type=aor before [1001] type=endpoint, aors=1001, transport-wss loaded"
  echo "Fix: git pull && docker compose --env-file .env -f docker-compose.prod.yml build --no-cache asterisk && docker compose --env-file .env -f docker-compose.prod.yml up -d --force-recreate asterisk"
fi
