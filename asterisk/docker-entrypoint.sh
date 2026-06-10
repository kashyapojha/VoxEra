#!/bin/sh
set -e

ASTERISK_WS_PORT="${ASTERISK_WS_PORT:-8089}"
ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-${PUBLIC_HOST:-127.0.0.1}}"
if [ -z "$ASTERISK_EXTERNAL_IP" ]; then
  ASTERISK_EXTERNAL_IP="127.0.0.1"
fi
export ASTERISK_EXTERNAL_IP ASTERISK_WS_PORT
echo "[asterisk] ASTERISK_EXTERNAL_IP=${ASTERISK_EXTERNAL_IP} ASTERISK_WS_PORT=${ASTERISK_WS_PORT}"

strip_crlf() {
  tr -d '\r'
}

AST_BIN="/usr/sbin/asterisk"
[ -x "$AST_BIN" ] || AST_BIN="asterisk"

mkdir -p /var/run/asterisk /var/log/asterisk 2>/dev/null || true

PJSIP_OUTPUT="/etc/asterisk/pjsip.conf"
HTTP_OUTPUT="/etc/asterisk/http.conf"

rm -f /etc/asterisk/pjsip.conf 2>/dev/null || true
# Empty wizard file — silences "Unable to load pjsip_wizard.conf" from base image hooks.
printf '[general]\n' > /etc/asterisk/pjsip_wizard.conf

for conf in modules.conf sorcery.conf extconfig.conf extensions.conf rtp.conf; do
  src="/etc/asterisk/${conf}"
  if [ -f "$src" ]; then
    strip_crlf < "$src" > "/tmp/${conf}"
    mv "/tmp/${conf}" "$src"
  fi
done

# Generate pjsip.conf inline — avoids envsubst corrupting auth_username,username / aors lines.
generate_pjsip_conf() {
  cat > "$PJSIP_OUTPUT" <<EOF
; WebRTC PJSIP — generated at container start

[global]
type=global
endpoint_identifier_order=auth_username,username
default_realm=${ASTERISK_EXTERNAL_IP}

[transport-wss]
type=transport
protocol=ws
bind=0.0.0.0:${ASTERISK_WS_PORT}
external_signaling_address=${ASTERISK_EXTERNAL_IP}
external_media_address=${ASTERISK_EXTERNAL_IP}

[1001-auth]
type=auth
auth_type=userpass
username=1001
password=1001
realm=${ASTERISK_EXTERNAL_IP}

[1001]
type=aor
max_contacts=5
remove_existing=yes

[1001]
type=endpoint
transport=transport-wss
context=internal
aors=1001
auth=1001-auth
inbound_auth=1001-auth
from_user=1001
from_domain=${ASTERISK_EXTERNAL_IP}
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
dtls_auto_generate_cert=yes
dtls_verify=fingerprint
dtls_setup=actpass
ice_support=yes
media_use_received_transport=yes
rtcp_mux=yes
force_rport=yes
rewrite_contact=yes
rtp_symmetric=yes
direct_media=no

[1002-auth]
type=auth
auth_type=userpass
username=1002
password=1002
realm=${ASTERISK_EXTERNAL_IP}

[1002]
type=aor
max_contacts=5
remove_existing=yes

[1002]
type=endpoint
transport=transport-wss
context=internal
aors=1002
auth=1002-auth
inbound_auth=1002-auth
from_user=1002
from_domain=${ASTERISK_EXTERNAL_IP}
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
dtls_auto_generate_cert=yes
dtls_verify=fingerprint
dtls_setup=actpass
ice_support=yes
media_use_received_transport=yes
rtcp_mux=yes
force_rport=yes
rewrite_contact=yes
rtp_symmetric=yes
direct_media=no
EOF
  strip_crlf < "$PJSIP_OUTPUT" > /tmp/pjsip.conf
  mv /tmp/pjsip.conf "$PJSIP_OUTPUT"
}

generate_http_conf() {
  cat > "$HTTP_OUTPUT" <<EOF
[general]
servername=Asterisk
enabled=yes
bindaddr=0.0.0.0
bindport=${ASTERISK_WS_PORT}
enable_status=yes

[websocket]
enabled=yes
EOF
  strip_crlf < "$HTTP_OUTPUT" > /tmp/http.conf
  mv /tmp/http.conf "$HTTP_OUTPUT"
}

generate_pjsip_conf
generate_http_conf

echo "[asterisk] external_signaling/media address: ${ASTERISK_EXTERNAL_IP}"
if [ "$ASTERISK_EXTERNAL_IP" = "127.0.0.1" ]; then
  echo "[asterisk] WARNING: ASTERISK_EXTERNAL_IP=127.0.0.1 — set PUBLIC_HOST in production"
fi
echo "[asterisk] digest default_realm: $(grep '^default_realm=' "$PJSIP_OUTPUT" | head -1)"
echo "[asterisk] endpoint_identifier_order: $(grep '^endpoint_identifier_order=' "$PJSIP_OUTPUT" | head -1)"
echo "[asterisk] endpoint aors: $(grep '^aors=1001$' "$PJSIP_OUTPUT" | head -1)"

if ! grep -q '^aors=1001$' "$PJSIP_OUTPUT"; then
  echo "[asterisk] FATAL: generated pjsip.conf missing aors=1001"
  sed -n '1,60p' "$PJSIP_OUTPUT" 2>/dev/null || true
  exit 1
fi

for mod in res_sorcery res_pjsip res_http_websocket res_pjsip_transport_websocket; do
  if [ -f "/usr/lib/asterisk/modules/${mod}.so" ] || [ -f "/usr/lib64/asterisk/modules/${mod}.so" ]; then
    echo "[asterisk] module present: ${mod}.so"
  else
    echo "[asterisk] ERROR: missing ${mod}.so"
    exit 1
  fi
done

echo "[asterisk] starting Asterisk (foreground)..."
exec "$AST_BIN" -f -vvvg -c
