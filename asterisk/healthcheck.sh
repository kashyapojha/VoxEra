#!/bin/sh
# Asterisk healthy when process is up, HTTP stack responds, and PJSIP 1001 is loaded.
PORT="${ASTERISK_WS_PORT:-8089}"

pgrep -x asterisk >/dev/null 2>&1 || exit 1

http_ok=0
if command -v wget >/dev/null 2>&1; then
  wget -qO- "http://127.0.0.1:${PORT}/httpstatus" 2>/dev/null | grep -qi asterisk && http_ok=1
elif command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:${PORT}/httpstatus" 2>/dev/null | grep -qi asterisk && http_ok=1
fi
if [ "$http_ok" -ne 1 ]; then
  asterisk -rx 'module show like res_http_websocket' 2>/dev/null | grep -q res_http_websocket || exit 1
fi

AOR_OUT="$(asterisk -rx 'pjsip show aor 1001' 2>&1)" || AOR_OUT=""
EP_OUT="$(asterisk -rx 'pjsip show endpoint 1001' 2>&1)" || EP_OUT=""
printf '%s' "$AOR_OUT" | grep -q '1001' || exit 1
printf '%s' "$AOR_OUT" | grep -qi 'Unable to find' && exit 1
printf '%s' "$EP_OUT" | grep -q '1001' || exit 1
printf '%s' "$EP_OUT" | grep -qi 'Unable to find' && exit 1
exit 0
