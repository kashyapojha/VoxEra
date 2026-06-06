#!/bin/sh
set -e

ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-127.0.0.1}"
ASTERISK_WS_PORT="${ASTERISK_WS_PORT:-8089}"
export ASTERISK_EXTERNAL_IP ASTERISK_WS_PORT

PJSIP_TEMPLATE="/etc/asterisk/templates/pjsip.conf.template"
PJSIP_OUTPUT="/etc/asterisk/pjsip.conf"
HTTP_TEMPLATE="/etc/asterisk/templates/http.conf.template"
HTTP_OUTPUT="/etc/asterisk/http.conf"

if [ -f "$PJSIP_TEMPLATE" ]; then
  envsubst '${ASTERISK_EXTERNAL_IP} ${ASTERISK_WS_PORT}' < "$PJSIP_TEMPLATE" > "$PJSIP_OUTPUT"
  echo "[asterisk] external_signaling/media address: ${ASTERISK_EXTERNAL_IP}"
  if grep -q 'endpoint_identifier_order=auth_username,username,ip' "$PJSIP_OUTPUT"; then
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
