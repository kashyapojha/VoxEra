#!/bin/bash
# Watch Asterisk contacts while registering extensions in the browser.
# Run on EC2: bash scripts/watch-sip-contacts.sh
set -euo pipefail

DOCKER=(docker)
if ! docker info &>/dev/null 2>&1 && sudo docker info &>/dev/null 2>&1; then
  DOCKER=(sudo docker)
fi

C="${DOCKER[@]} exec voxera-asterisk"

echo "========== Watching SIP contacts (60s) =========="
echo "Register 1001 and 1002 in the browser NOW — keep both tabs open."
echo "Expected: 1001/sip:1001@<your-ip>:<port>;transport=ws"
echo "          1002/sip:1002@<your-ip>:<port>;transport=ws"
echo ""

for i in $(seq 1 20); do
  echo "--- $(date -u +%H:%M:%S) poll $i/20 ---"
  "${DOCKER[@]}" exec voxera-asterisk asterisk -rx "pjsip show contacts" 2>/dev/null || true
  echo ""
  sleep 3
done

echo "=== Recent REGISTER / bind lines from Asterisk log ==="
"${DOCKER[@]}" logs voxera-asterisk --tail 80 2>&1 | grep -iE 'REGISTER|bind contact|Unable to bind|1001|1002|websocket' || \
  echo "(no REGISTER lines in last 80 log lines — try registering again while this script runs)"
