#!/bin/bash
# Quick SIP registration diagnostics — run on EC2 or local with Docker.
set -euo pipefail

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1 && sudo docker info &>/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

C="${DOCKER[@]} exec voxera-asterisk"

echo "=== Asterisk container ==="
"${DOCKER[@]}" ps -a --filter name=voxera-asterisk --format '{{.Names}} {{.Status}}' || true
echo ""

if ! "${DOCKER[@]}" ps --format '{{.Names}}' | grep -qx 'voxera-asterisk'; then
  echo "FAIL: voxera-asterisk is not running"
  "${DOCKER[@]}" logs voxera-asterisk --tail 60 2>&1 || true
  exit 1
fi

echo "=== split PJSIP config ==="
$C cat /etc/asterisk/pjsip.aor.conf 2>/dev/null || true
echo "---"
$C cat /etc/asterisk/pjsip.endpoint.conf 2>/dev/null || true
echo "---"
$C grep '^contact=' /etc/asterisk/sorcery.conf 2>/dev/null || true
echo ""

echo "=== PJSIP objects ==="
$C asterisk -rx "pjsip show endpoint 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show aor 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show transport transport-wss" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show contacts" 2>/dev/null || true
echo ""

ok=1
if $C asterisk -rx "pjsip show endpoint 1001" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: endpoint 1001 not loaded"
  ok=0
fi
if $C asterisk -rx "pjsip show aor 1001" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: AOR 1001 not loaded"
  ok=0
fi
if $C grep -q 'aors=1001-aor' /etc/asterisk/pjsip.endpoint.conf 2>/dev/null; then
  echo "FAIL: stale aors=1001-aor in endpoint config"
  ok=0
fi
if ! $C grep -q '^aors=1001$' /etc/asterisk/pjsip.endpoint.conf 2>/dev/null; then
  echo "FAIL: endpoint must have aors=1001"
  ok=0
fi
if ! $C grep -q '^contact=memory$' /etc/asterisk/sorcery.conf 2>/dev/null; then
  echo "FAIL: sorcery.conf must use contact=memory"
  ok=0
fi
if $C asterisk -rx "pjsip show transport transport-wss" 2>&1 | grep -q 'Unable to find'; then
  echo "FAIL: transport-wss not loaded"
  ok=0
fi

if [ "$ok" -eq 1 ]; then
  echo "OK: AOR 1001 + endpoint 1001 + transport-wss + contact=memory"
else
  echo "Fix: docker compose --env-file .env -f docker-compose.prod.yml build --no-cache asterisk && docker compose --env-file .env -f docker-compose.prod.yml up -d --force-recreate asterisk"
  exit 1
fi
