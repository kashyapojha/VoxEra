#!/bin/sh
# Verify Asterisk is up, HTTP/WebSocket stack is live, and PJSIP 1001 is loaded.
set -eu

PORT="${ASTERISK_WS_PORT:-8089}"

pgrep -x asterisk >/dev/null 2>&1 || exit 1

if ! wget -qO- "http://127.0.0.1:${PORT}/httpstatus" 2>/dev/null | grep -qi asterisk; then
  exit 1
fi

for _ in 1 2 3 4 5; do
  AOR_OUT="$(asterisk -rx 'pjsip show aor 1001' 2>&1)" || AOR_OUT=""
  EP_OUT="$(asterisk -rx 'pjsip show endpoint 1001' 2>&1)" || EP_OUT=""
  if printf '%s' "$AOR_OUT" | grep -qv 'Unable to find' \
    && printf '%s' "$EP_OUT" | grep -qv 'Unable to find'; then
    exit 0
  fi
  sleep 2
done

exit 1
