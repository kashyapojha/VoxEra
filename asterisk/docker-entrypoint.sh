#!/bin/sh
set -e

ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-127.0.0.1}"
export ASTERISK_EXTERNAL_IP

TEMPLATE="/etc/asterisk/templates/pjsip.conf.template"
OUTPUT="/etc/asterisk/pjsip.conf"

if [ -f "$TEMPLATE" ]; then
  envsubst '${ASTERISK_EXTERNAL_IP}' < "$TEMPLATE" > "$OUTPUT"
  echo "[asterisk] external_signaling/media address: ${ASTERISK_EXTERNAL_IP}"
fi

exec /usr/sbin/asterisk -f -vvvg -c
