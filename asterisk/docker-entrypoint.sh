#!/bin/sh
set -e

ASTERISK_WS_PORT="${ASTERISK_WS_PORT:-8089}"
ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-${PUBLIC_HOST:-127.0.0.1}}"
if [ -z "$ASTERISK_EXTERNAL_IP" ]; then
  ASTERISK_EXTERNAL_IP="127.0.0.1"
fi
export ASTERISK_EXTERNAL_IP ASTERISK_WS_PORT
echo "[asterisk] ASTERISK_EXTERNAL_IP=${ASTERISK_EXTERNAL_IP}"

strip_crlf() {
  tr -d '\r'
}

AST_BIN="/usr/sbin/asterisk"
[ -x "$AST_BIN" ] || AST_BIN="asterisk"

mkdir -p /var/run/asterisk /var/log/asterisk 2>/dev/null || true

PJSIP_TEMPLATE="/etc/asterisk/templates/pjsip.conf.template"
PJSIP_OUTPUT="/etc/asterisk/pjsip.conf"
HTTP_TEMPLATE="/etc/asterisk/templates/http.conf.template"
HTTP_OUTPUT="/etc/asterisk/http.conf"

rm -f /etc/asterisk/pjsip.conf /etc/asterisk/pjsip_wizard.conf 2>/dev/null || true

for conf in modules.conf sorcery.conf extconfig.conf extensions.conf rtp.conf; do
  src="/etc/asterisk/${conf}"
  if [ -f "$src" ]; then
    strip_crlf < "$src" > "/tmp/${conf}"
    mv "/tmp/${conf}" "$src"
  fi
done

if [ -f "$PJSIP_TEMPLATE" ]; then
  envsubst '${ASTERISK_EXTERNAL_IP} ${ASTERISK_WS_PORT}' < "$PJSIP_TEMPLATE" | strip_crlf > "$PJSIP_OUTPUT"
  echo "[asterisk] external_signaling/media address: ${ASTERISK_EXTERNAL_IP}"
  if grep -q $'\r' "$PJSIP_OUTPUT" 2>/dev/null; then
    echo "[asterisk] ERROR: pjsip.conf contains CR characters"
    exit 1
  fi
  if grep -q '\${ASTERISK' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: pjsip.conf still contains unsubstituted variables"
    exit 1
  fi
  if [ "$ASTERISK_EXTERNAL_IP" = "127.0.0.1" ]; then
    echo "[asterisk] WARNING: ASTERISK_EXTERNAL_IP=127.0.0.1 — set PUBLIC_HOST in production"
  fi
  echo "[asterisk] digest default_realm: $(grep '^default_realm=' "$PJSIP_OUTPUT" | head -1)"
  echo "[asterisk] endpoint_identifier_order: $(grep '^endpoint_identifier_order=' "$PJSIP_OUTPUT" | head -1)"
  if ! grep -q '^aors=1001$' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: endpoint missing aors=1001"
    exit 1
  fi
fi

if [ -f "$HTTP_TEMPLATE" ]; then
  envsubst '${ASTERISK_WS_PORT}' < "$HTTP_TEMPLATE" | strip_crlf > "$HTTP_OUTPUT"
fi

for mod in res_http_websocket res_pjsip_transport_websocket; do
  if [ -f "/usr/lib/asterisk/modules/${mod}.so" ] || [ -f "/usr/lib64/asterisk/modules/${mod}.so" ]; then
    echo "[asterisk] module present: ${mod}.so"
  else
    echo "[asterisk] ERROR: missing ${mod}.so"
    exit 1
  fi
done

echo "[asterisk] starting Asterisk..."
"$AST_BIN" -f -vvvg -c &
ASTERISK_PID=$!

cli_ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
  if "$AST_BIN" -rx "core show uptime" 2>/dev/null | grep -qi uptime; then
    cli_ready=1
    break
  fi
  sleep 2
done

if [ "$cli_ready" -eq 1 ]; then
  "$AST_BIN" -rx "module reload res_pjsip.so" 2>&1 || true
  "$AST_BIN" -rx "pjsip reload" 2>&1 || true
  AOR_OUT="$("$AST_BIN" -rx "pjsip show aor 1001" 2>&1)" || AOR_OUT=""
  EP_OUT="$("$AST_BIN" -rx "pjsip show endpoint 1001" 2>&1)" || EP_OUT=""
  if printf '%s' "$AOR_OUT" | grep -qi 'Unable to find' || printf '%s' "$EP_OUT" | grep -qi 'Unable to find'; then
    echo "[asterisk] WARNING: PJSIP 1001 not loaded after reload"
    "$AST_BIN" -rx "pjsip show endpoints" 2>&1 || true
    "$AST_BIN" -rx "module show like res_pjsip" 2>&1 || true
    if [ -f /var/log/asterisk/messages ]; then
      grep -iE 'error|pjsip|sorcery|reject|duplicate' /var/log/asterisk/messages 2>/dev/null | tail -30 || true
    fi
  else
    echo "[asterisk] PJSIP ready — endpoint 1001 + AOR 1001 loaded"
  fi
else
  echo "[asterisk] WARNING: Asterisk CLI not ready within 40s"
fi

wait "$ASTERISK_PID"
exit $?
