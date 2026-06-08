#!/bin/sh
set -e

ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-127.0.0.1}"
ASTERISK_WS_PORT="${ASTERISK_WS_PORT:-8089}"
export ASTERISK_EXTERNAL_IP ASTERISK_WS_PORT

PJSIP_TEMPLATE="/etc/asterisk/templates/pjsip.conf.template"
PJSIP_OUTPUT="/etc/asterisk/pjsip.conf"
HTTP_TEMPLATE="/etc/asterisk/templates/http.conf.template"
HTTP_OUTPUT="/etc/asterisk/http.conf"

# Base image may ship wizard/realtime configs that shadow static pjsip.conf.
rm -f /etc/asterisk/pjsip_wizard.conf 2>/dev/null || true

if [ -f "$PJSIP_TEMPLATE" ]; then
  envsubst '${ASTERISK_EXTERNAL_IP} ${ASTERISK_WS_PORT}' < "$PJSIP_TEMPLATE" > "$PJSIP_OUTPUT"
  echo "[asterisk] external_signaling/media address: ${ASTERISK_EXTERNAL_IP}"
  if grep -q '\${ASTERISK' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: pjsip.conf still contains unsubstituted variables"
    exit 1
  fi
  if [ "$ASTERISK_EXTERNAL_IP" = "127.0.0.1" ]; then
    echo "[asterisk] WARNING: ASTERISK_EXTERNAL_IP=127.0.0.1 — set to your public IP in production"
  fi
  echo "[asterisk] digest default_realm: $(grep '^default_realm=' "$PJSIP_OUTPUT" | head -1)"
  echo "[asterisk] 1001 auth realm: $(awk '/^\[1001\]/{f=1;next} /^\[/{f=0} f && /^realm=/{print; exit}' "$PJSIP_OUTPUT")"
  echo "[asterisk] endpoint [1001] aors: $(awk '/^\[1001\]/{n++; if(n==3){f=1;next}} /^\[/{if(n==3)f=0} f && /^aors=/{print; exit}' "$PJSIP_OUTPUT")"
  echo "[asterisk] endpoint [1001] auth: $(awk '/^\[1001\]/{n++; if(n==3){f=1;next}} /^\[/{if(n==3)f=0} f && /^auth=/{print; exit}' "$PJSIP_OUTPUT")"
  if ! grep -q '^aors=1001$' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: endpoint 1001 missing aors=1001 — registrar will return 404"
    exit 1
  fi
  if ! grep -q '^auth=1001$' "$PJSIP_OUTPUT"; then
    echo "[asterisk] ERROR: endpoint 1001 missing auth=1001"
    exit 1
  fi
  if grep -q 'endpoint_identifier_order=username,auth_username,ip' "$PJSIP_OUTPUT"; then
    echo "[asterisk] pjsip.conf: endpoint_identifier_order set"
  else
    echo "[asterisk] WARNING: endpoint_identifier_order missing from pjsip.conf"
  fi
  if grep -q "bind=0.0.0.0:${ASTERISK_WS_PORT}" "$PJSIP_OUTPUT"; then
    echo "[asterisk] pjsip.conf: WebSocket transport on port ${ASTERISK_WS_PORT}"
  else
    echo "[asterisk] WARNING: pjsip transport port mismatch (expected ${ASTERISK_WS_PORT})"
  fi
fi

if [ -f "$HTTP_TEMPLATE" ]; then
  envsubst '${ASTERISK_WS_PORT}' < "$HTTP_TEMPLATE" > "$HTTP_OUTPUT"
  if grep -q "bindport=${ASTERISK_WS_PORT}" "$HTTP_OUTPUT"; then
    echo "[asterisk] http.conf: listening on port ${ASTERISK_WS_PORT}"
  else
    echo "[asterisk] WARNING: http.conf bindport mismatch (expected ${ASTERISK_WS_PORT})"
  fi
fi

exec /usr/sbin/asterisk -f -vvvg -c
