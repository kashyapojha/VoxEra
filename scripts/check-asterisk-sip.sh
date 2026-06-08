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
$C grep -E '^\[1001\]|^type=|^aors=|^auth=|^inbound_auth=|^realm=' /etc/asterisk/pjsip.conf 2>/dev/null || echo "Container not running or pjsip.conf missing"
echo ""

echo "=== PJSIP objects ==="
$C asterisk -rx "pjsip show endpoint 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show aor 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show auth 1001" 2>/dev/null || true
echo ""

echo "=== Registered contacts ==="
$C asterisk -rx "pjsip show contacts" 2>/dev/null || true
echo ""

if $C grep -q '^aors=1001$' /etc/asterisk/pjsip.conf 2>/dev/null; then
  echo "OK: aors=1001 present — config looks correct for extension 1001"
else
  echo "FAIL: aors=1001 missing — REGISTER will fail with 404"
  echo "Fix: git pull && docker compose --env-file .env -f docker-compose.prod.yml up -d asterisk"
fi
