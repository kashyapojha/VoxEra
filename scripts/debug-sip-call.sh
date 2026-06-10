#!/bin/bash
# SIP call-path diagnostics — run on EC2 while testing 1001 <-> 1002 calls.
set -euo pipefail

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1 && sudo docker info &>/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

C="${DOCKER[@]} exec voxera-asterisk"
ENV_FILE="${ENV_FILE:-$HOME/voxera/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && . "$ENV_FILE" && set +a
fi

echo "========== VoxEra SIP diagnostics =========="
echo ""

echo "=== 1. Frontend image (must be built locally, not stale Docker Hub) ==="
"${DOCKER[@]}" inspect voxera-frontend --format='Image={{.Image}} Created={{.Created}}' 2>/dev/null || echo "voxera-frontend not running"
if "${DOCKER[@]}" images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -q 'voxera-frontend:local'; then
  echo "OK: voxera-frontend:local image exists (built from repo)"
else
  echo "WARN: no voxera-frontend:local — run: bash scripts/rebuild-frontend-ec2.sh"
fi
echo ""

echo "=== 2. Asterisk PJSIP ==="
$C asterisk -rx "pjsip show endpoints" 2>/dev/null | head -20 || true
echo ""
$C asterisk -rx "pjsip show aor 1001" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show aor 1002" 2>/dev/null || true
echo ""
$C asterisk -rx "pjsip show contacts" 2>/dev/null || true
echo ""

echo "=== 3. Dialplan (must show _10XX + Ringing + Dial) ==="
$C asterisk -rx "dialplan show internal" 2>/dev/null | head -25 || true
echo ""

echo "=== 4. Transport ==="
$C asterisk -rx "pjsip show transport transport-wss" 2>/dev/null || true
echo ""

echo "=== 5. Active channels (run DURING a test call) ==="
$C asterisk -rx "core show channels verbose" 2>/dev/null || true
echo ""

echo "=== 6. Recent Asterisk log (INVITE/Dial errors) ==="
"${DOCKER[@]}" logs voxera-asterisk --tail 40 2>&1 | grep -iE 'INVITE|Dial|PJSIP|1001|1002|ERROR|NOTICE|failed' || \
  "${DOCKER[@]}" logs voxera-asterisk --tail 15 2>&1 || true
echo ""

echo "========== Browser checklist =========="
echo "  • Use TWO browsers (or normal + incognito) — not two tabs only if WS acts up"
echo "  • Browser A: register 1001 / password 1001"
echo "  • Browser B: register 1002 / password 1002"
echo "  • Status must say: ready for calls (green), NOT WebSocket reconnecting"
echo "  • Console must show: [SIP] Registered — sip:100X@..."
echo "  • Caller console: [SIP] INVITE sent → Session progress — 180"
echo "  • Callee console: [SIP] Incoming call from 100X"
echo "  • Callee must click Answer (green button)"
echo ""
echo "Rebuild frontend if fixes missing: bash scripts/rebuild-frontend-ec2.sh"
