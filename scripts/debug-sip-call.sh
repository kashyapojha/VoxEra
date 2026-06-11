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
CONTACTS="$($C asterisk -rx "pjsip show contacts" 2>/dev/null || true)"
echo "$CONTACTS"
if printf '%s' "$CONTACTS" | grep -qi 'No objects found'; then
  echo ""
  echo "FAIL: No SIP contacts registered — Asterisk cannot deliver INVITEs."
  echo "  → Register 1001 and 1002 in the browser FIRST, then re-run:"
  echo "     docker exec voxera-asterisk asterisk -rx \"pjsip show contacts\""
  echo "  → Or watch live: bash scripts/watch-sip-contacts.sh"
  echo "  → If browsers show Registered but contacts stay empty, rebuild frontend:"
  echo "     bash scripts/rebuild-frontend-ec2.sh"
elif printf '%s' "$CONTACTS" | grep -q '1001/' && printf '%s' "$CONTACTS" | grep -q '1002/'; then
  echo "OK: both 1001 and 1002 have contacts"
elif printf '%s' "$CONTACTS" | grep -qE '100[12]/'; then
  echo "WARN: only one extension registered — register the other browser too"
else
  echo "WARN: contacts present but format unexpected — check for extension IDs (not random strings)"
fi
echo ""

echo "=== 3. Dialplan (must show _10XX + Dial(PJSIP/\${EXTEN}@\${EXTEN},30,r)) ==="
DIALPLAN="$($C asterisk -rx "dialplan show internal" 2>/dev/null | head -25 || true)"
echo "$DIALPLAN"
if printf '%s' "$DIALPLAN" | grep -q '_10XX'; then
  echo "OK: wildcard _10XX dialplan loaded"
else
  echo "FAIL: stale dialplan — run: bash scripts/rebuild-asterisk-ec2.sh"
fi
if printf '%s' "$DIALPLAN" | grep -q 'Dial(PJSIP/\${EXTEN}@\${EXTEN}'; then
  echo "OK: explicit endpoint Dial(PJSIP/ext@ext)"
else
  echo "FAIL: need Dial(PJSIP/\${EXTEN}@\${EXTEN},30,r) — run: bash scripts/rebuild-asterisk-ec2.sh"
fi
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
echo "  • Use TWO browsers (or normal + incognito)"
echo "  • Browser A: register 1001 / password 1001 — navbar must show ext 1001 + SIP ready"
echo "  • Browser B: register 1002 / password 1002 — navbar must show ext 1002 + SIP ready"
echo "  • If BOTH show ext 1001, callee will never get 1002 calls (change extension on browser B)"
echo "  • pjsip show contacts must list BOTH 1001 and 1002 with WSS contacts"
echo "  • Caller console: [SIP] INVITE sent → Session progress — 180"
echo "  • Callee console: [SIP] Incoming call from 1001 + green navbar Answer bar"
echo "  • Callee must click Answer"
echo ""
echo "Rebuild frontend if fixes missing: bash scripts/rebuild-frontend-ec2.sh"
