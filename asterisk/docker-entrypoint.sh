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

rm -f /etc/asterisk/pjsip.conf /etc/asterisk/pjsip_wizard.conf 2>/dev/null || true

for conf in extconfig.conf extensions.conf rtp.conf; do
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

[1001-aor]
type=aor
max_contacts=5
remove_existing=yes
support_path=yes

[1001]
type=endpoint
transport=transport-wss
context=internal
aors=1001-aor
auth=1001-auth
from_user=1001
from_domain=${ASTERISK_EXTERNAL_IP}
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
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

[1002-aor]
type=aor
max_contacts=5
remove_existing=yes
support_path=yes

[1002]
type=endpoint
transport=transport-wss
context=internal
aors=1002-aor
auth=1002-auth
from_user=1002
from_domain=${ASTERISK_EXTERNAL_IP}
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
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
echo "[asterisk] endpoint aors: $(grep '^aors=1001-aor$' "$PJSIP_OUTPUT" | head -1)"

if ! grep -q '^aors=1001-aor$' "$PJSIP_OUTPUT"; then
  echo "[asterisk] FATAL: generated pjsip.conf missing aors=1001-aor"
  sed -n '1,60p' "$PJSIP_OUTPUT" 2>/dev/null || true
  exit 1
fi

echo "[asterisk] starting Asterisk..."
"$AST_BIN" -f -vvvg -c &
ASTERISK_PID=$!

# Wait for CLI, then reload PJSIP so objects load after res_pjsip registers types.
cli_ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if "$AST_BIN" -rx "core show uptime" 2>/dev/null | grep -qi uptime; then
    cli_ready=1
    break
  fi
  sleep 2
done

if [ "$cli_ready" -eq 1 ]; then
  echo "[asterisk] sorcery endpoint source: $(grep '^endpoint=' /etc/asterisk/sorcery.conf 2>/dev/null | head -1)"
  "$AST_BIN" -rx "module show like res_pjsip" 2>&1 | head -5 || true
  "$AST_BIN" -rx "module reload res_pjsip.so" 2>&1 | tail -2 || true
  "$AST_BIN" -rx "pjsip reload" 2>&1 | tail -3 || true
  sleep 3
  "$AST_BIN" -rx "pjsip reload" 2>&1 | tail -2 || true
  sleep 2
  AOR_OUT="$("$AST_BIN" -rx "pjsip show aor 1001-aor" 2>&1)" || AOR_OUT=""
  EP_OUT="$("$AST_BIN" -rx "pjsip show endpoint 1001" 2>&1)" || EP_OUT=""
  if printf '%s' "$AOR_OUT" | grep -qi 'Unable to find' || printf '%s' "$EP_OUT" | grep -qi 'Unable to find'; then
    echo "[asterisk] WARNING: PJSIP 1001 not loaded after reload"
    "$AST_BIN" -rx "pjsip show transports" 2>&1 || true
    "$AST_BIN" -rx "pjsip show endpoints" 2>&1 || true
    "$AST_BIN" -rx "pjsip show aors" 2>&1 || true
    if [ -f /var/log/asterisk/messages ]; then
      grep -iE 'error|pjsip|Could not find option|duplicate' /var/log/asterisk/messages 2>/dev/null | tail -20 || true
    fi
  else
    echo "[asterisk] PJSIP ready — endpoint 1001 + AOR 1001-aor loaded"
  fi
else
  echo "[asterisk] WARNING: Asterisk CLI not ready within 30s"
fi

wait "$ASTERISK_PID"
exit $?
