#!/bin/bash
# Quick SIP registration diagnostics — run on EC2 or local with Docker.
set -euo pipefail

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1 && sudo docker info &>/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

C="${DOCKER[@]} exec voxera-asterisk"
SIP_REALM="${ASTERISK_EXTERNAL_IP:-${PUBLIC_HOST:-127.0.0.1}}"
SIP_AOR_1001="1001@${SIP_REALM}"

echo "=== Asterisk container ==="
"${DOCKER[@]}" ps -a --filter name=voxera-asterisk --format '{{.Names}} {{.Status}}' || true
echo ""

if ! "${DOCKER[@]}" ps --format '{{.Names}}' | grep -qx 'voxera-asterisk'; then
  echo "FAIL: voxera-asterisk is not running"
  "${DOCKER[@]}" logs voxera-asterisk --tail 60 2>&1 || true
  exit 1
fi

echo "=== pjsip.conf ==="
$C grep -E '^\[1001|^\[1001@|^\[1001-auth\]|^type=|^aors=|^auth=|^realm=' /etc/asterisk/pjsip.conf 2>/dev/null || true
echo ""

echo "=== WebSocket modules ==="
$C asterisk -rx "module show like websocket" 2>&1 || true
echo ""

echo "=== PJSIP objects ==="
$C asterisk -rx "pjsip show endpoint 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show aor ${SIP_AOR_1001}" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show transport transport-wss" 2>/dev/null || true
echo ""

ok=1
if $C asterisk -rx "pjsip show endpoint 1001" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: endpoint 1001 not loaded"
  ok=0
fi
if $C asterisk -rx "pjsip show aor ${SIP_AOR_1001}" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: AOR ${SIP_AOR_1001} not loaded (never use two [1001] sections in pjsip.conf)"
  ok=0
fi
if $C asterisk -rx "pjsip show transport transport-wss" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: transport-wss not loaded — REGISTER times out"
  ok=0
fi

if [ "$ok" -eq 1 ]; then
  echo "OK: endpoint 1001 + AOR ${SIP_AOR_1001} + transport-wss"
else
  echo "Fix: docker compose --env-file .env -f docker-compose.prod.yml build --no-cache asterisk && docker compose --env-file .env -f docker-compose.prod.yml up -d --force-recreate asterisk"
  exit 1
fi
