#!/bin/sh
set -e

ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-127.0.0.1}"
export ASTERISK_EXTERNAL_IP

TEMPLATE="/etc/asterisk/templates/pjsip.conf.template"
OUTPUT="/etc/asterisk/pjsip.conf"

if [ -f "$TEMPLATE" ]; then
  envsubst '${ASTERISK_EXTERNAL_IP}' < "$TEMPLATE" > "$OUTPUT"
  echo "[asterisk] external_signaling/media address: ${ASTERISK_EXTERNAL_IP}"
  if grep -q 'endpoint_identifier_order=auth_username,username,ip' "$OUTPUT"; then
    echo "[asterisk] pjsip.conf: endpoint_identifier_order set (REGISTER username → endpoint)"
  else
    echo "[asterisk] WARNING: endpoint_identifier_order missing from pjsip.conf"
  fi
fi

exec /usr/sbin/asterisk -f -vvvg -c
