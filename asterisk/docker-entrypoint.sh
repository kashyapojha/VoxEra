#!/bin/sh
set -e

ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-127.0.0.1}"
ASTERISK_WS_PORT="${ASTERISK_WS_PORT:-8089}"
if [ -z "$ASTERISK_EXTERNAL_IP" ]; then
  ASTERISK_EXTERNAL_IP="127.0.0.1"
fi
export ASTERISK_EXTERNAL_IP ASTERISK_WS_PORT

strip_crlf() {
  tr -d '\r'
}

mkdir -p /var/run/asterisk /var/log/asterisk 2>/dev/null || true

PJSIP_TEMPLATE="/etc/asterisk/templates/pjsip.conf.template"
PJSIP_OUTPUT="/etc/asterisk/pjsip.conf"
HTTP_TEMPLATE="/etc/asterisk/templates/http.conf.template"
HTTP_OUTPUT="/etc/asterisk/http.conf"

rm -f /etc/asterisk/pjsip_wizard.conf 2>/dev/null || true

# Normalize static configs baked into the image (guards against CRLF if host ever mounted them).
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
    echo "[asterisk] ERROR: pjsip.conf contains CR characters — PJSIP objects will not load"
    exit 1
  fi
  if grep -q '\${ASTERISK' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: pjsip.conf still contains unsubstituted variables"
    exit 1
  fi
  if [ "$ASTERISK_EXTERNAL_IP" = "127.0.0.1" ]; then
    echo "[asterisk] WARNING: ASTERISK_EXTERNAL_IP=127.0.0.1 — set to your public IP in production"
  fi
  echo "[asterisk] digest default_realm: $(grep '^default_realm=' "$PJSIP_OUTPUT" | head -1)"
  if ! grep -q '^aors=1001$' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: endpoint missing aors=1001"
    exit 1
  fi
  if ! grep -q '^auth=1001-auth$' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: endpoint missing auth=1001-auth"
    exit 1
  fi
  if ! grep -q '^inbound_auth=1001-auth$' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: endpoint missing inbound_auth=1001-auth"
    exit 1
  fi
fi

if [ -f "$HTTP_TEMPLATE" ]; then
  envsubst '${ASTERISK_WS_PORT}' < "$HTTP_TEMPLATE" | strip_crlf > "$HTTP_OUTPUT"
fi

for mod in res_http_websocket res_pjsip_transport_websocket res_pjsip res_sorcery_config; do
  if [ -f "/usr/lib/asterisk/modules/${mod}.so" ] || [ -f "/usr/lib64/asterisk/modules/${mod}.so" ]; then
    echo "[asterisk] module present: ${mod}.so"
  else
    echo "[asterisk] ERROR: missing ${mod}.so"
    exit 1
  fi
done

echo "[asterisk] starting Asterisk..."
/usr/sbin/asterisk -f -vvvg -c &
ASTERISK_PID=$!

pjsip_ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 20 25 30; do
  sleep 2
  AOR_OUT="$(asterisk -rx 'pjsip show aor 1001' 2>&1)" || AOR_OUT=""
  EP_OUT="$(asterisk -rx 'pjsip show endpoint 1001' 2>&1)" || EP_OUT=""
  if printf '%s' "$AOR_OUT" | grep -qv 'Unable to find' \
    && printf '%s' "$EP_OUT" | grep -qv 'Unable to find'; then
    pjsip_ready=1
    echo "[asterisk] PJSIP ready — endpoint 1001 + AOR 1001 loaded"
    break
  fi
done

if [ "$pjsip_ready" -ne 1 ]; then
  echo "[asterisk] FATAL: PJSIP endpoint/AOR 1001 not loaded"
  asterisk -rx 'module show like res_pjsip' 2>&1 || true
  asterisk -rx 'module show like res_sorcery' 2>&1 || true
  asterisk -rx 'pjsip show endpoints' 2>&1 || true
  asterisk -rx 'pjsip show aors' 2>&1 || true
  if [ -f /var/log/asterisk/messages ]; then
    grep -iE 'error|duplicate|reject|pjsip|sorcery' /var/log/asterisk/messages 2>/dev/null | tail -40 || true
  fi
  echo "[asterisk] --- generated pjsip.conf ---"
  sed -n '1,80p' "$PJSIP_OUTPUT" 2>/dev/null || true
  kill "$ASTERISK_PID" 2>/dev/null || true
  wait "$ASTERISK_PID" 2>/dev/null || true
  exit 1
fi

wait "$ASTERISK_PID"
exit $?
