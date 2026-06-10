#!/bin/sh
set -e

ASTERISK_WS_PORT="${ASTERISK_WS_PORT:-8089}"
ASTERISK_EXTERNAL_IP="${ASTERISK_EXTERNAL_IP:-${PUBLIC_HOST:-127.0.0.1}}"
if [ -z "$ASTERISK_EXTERNAL_IP" ]; then
  ASTERISK_EXTERNAL_IP="127.0.0.1"
fi
export ASTERISK_EXTERNAL_IP ASTERISK_WS_PORT
# AOR id must match REGISTER To user@host. Section name must differ from [1001] endpoint.
SIP_AOR_1001="1001@${ASTERISK_EXTERNAL_IP}"
SIP_AOR_1002="1002@${ASTERISK_EXTERNAL_IP}"
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

for conf in extconfig.conf extensions.conf rtp.conf modules.conf sorcery.conf; do
  src="/etc/asterisk/${conf}"
  if [ -f "$src" ]; then
    strip_crlf < "$src" > "/tmp/${conf}"
    mv "/tmp/${conf}" "$src"
  fi
done

generate_pjsip_conf() {
  cat > "$PJSIP_OUTPUT" <<EOF
; WebRTC PJSIP — generated at container start
; ONE [1001] endpoint block only. AOR uses unique id ${SIP_AOR_1001}.

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

[${SIP_AOR_1001}]
type=aor
max_contacts=5
remove_existing=yes
support_path=yes

[1001]
type=endpoint
transport=transport-wss
context=internal
aors=${SIP_AOR_1001}
auth=1001-auth
from_user=1001
from_domain=${ASTERISK_EXTERNAL_IP}
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
identify_by=auth_username,username
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

[${SIP_AOR_1002}]
type=aor
max_contacts=5
remove_existing=yes
support_path=yes

[1002]
type=endpoint
transport=transport-wss
context=internal
aors=${SIP_AOR_1002}
auth=1002-auth
from_user=1002
from_domain=${ASTERISK_EXTERNAL_IP}
disallow=all
allow=opus,ulaw,alaw
webrtc=yes
identify_by=auth_username,username
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
tlsenable=no
enable_status=yes

[websocket]
enabled=yes
EOF
  strip_crlf < "$HTTP_OUTPUT" > /tmp/http.conf
  mv /tmp/http.conf "$HTTP_OUTPUT"
}

verify_pjsip_runtime() {
  HTTP_OUT="$("$AST_BIN" -rx "http show status" 2>&1)" || HTTP_OUT=""
  AOR_OUT="$("$AST_BIN" -rx "pjsip show aor ${SIP_AOR_1001}" 2>&1)" || AOR_OUT=""
  EP_OUT="$("$AST_BIN" -rx "pjsip show endpoint 1001" 2>&1)" || EP_OUT=""
  TP_OUT="$("$AST_BIN" -rx "pjsip show transport transport-wss" 2>&1)" || TP_OUT=""
  WS_OUT="$("$AST_BIN" -rx "module show like websocket" 2>&1)" || WS_OUT=""
  CHAN_OUT="$("$AST_BIN" -rx "module show like chan_sip" 2>&1)" || CHAN_OUT=""

  echo "[asterisk] http show status:"
  printf '%s\n' "$HTTP_OUT" | head -8

  ok=1
  if ! printf '%s' "$HTTP_OUT" | grep -qi 'Enabled'; then
    echo "[asterisk] FATAL: HTTP server not enabled (WebSocket /ws will not work)"
    ok=0
  fi
  if printf '%s' "$AOR_OUT" | grep -qi 'Unable to find'; then
    echo "[asterisk] FATAL: AOR ${SIP_AOR_1001} not loaded"
    ok=0
  fi
  if printf '%s' "$EP_OUT" | grep -qi 'Unable to find'; then
    echo "[asterisk] FATAL: endpoint 1001 not loaded"
    ok=0
  fi
  if printf '%s' "$TP_OUT" | grep -qi 'Unable to find'; then
    echo "[asterisk] FATAL: transport-wss not loaded — WS connects but REGISTER gets no SIP reply"
    ok=0
  fi
  if ! printf '%s' "$WS_OUT" | grep -q 'res_http_websocket.so'; then
    echo "[asterisk] FATAL: res_http_websocket not loaded"
    ok=0
  fi
  if ! printf '%s' "$WS_OUT" | grep -q 'res_pjsip_transport_websocket.so'; then
    echo "[asterisk] FATAL: res_pjsip_transport_websocket not loaded"
    ok=0
  fi
  if printf '%s' "$CHAN_OUT" | grep -q '1 modules loaded'; then
    echo "[asterisk] FATAL: chan_sip loaded — steals WebSocket signaling"
    ok=0
  fi

  if [ "$ok" -eq 0 ]; then
    echo "[asterisk] --- pjsip.conf ---"
    cat "$PJSIP_OUTPUT" 2>/dev/null || true
    echo "[asterisk] --- pjsip show transports ---"
    "$AST_BIN" -rx "pjsip show transports" 2>&1 || true
    echo "[asterisk] --- pjsip show endpoints ---"
    "$AST_BIN" -rx "pjsip show endpoints" 2>&1 || true
    echo "[asterisk] --- pjsip show aors ---"
    "$AST_BIN" -rx "pjsip show aors" 2>&1 || true
    if [ -f /var/log/asterisk/messages ]; then
      echo "[asterisk] --- recent log ---"
      tail -40 /var/log/asterisk/messages 2>/dev/null || true
    fi
    return 1
  fi

  echo "[asterisk] PJSIP ready — endpoint 1001 + AOR ${SIP_AOR_1001} + transport-wss"
  return 0
}

generate_pjsip_conf
generate_http_conf

echo "[asterisk] generated aors line: $(grep '^aors=' "$PJSIP_OUTPUT" | head -1)"

echo "[asterisk] starting Asterisk..."
"$AST_BIN" -f -vvvg -c &
ASTERISK_PID=$!

cli_ready=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if "$AST_BIN" -rx "core show uptime" 2>/dev/null | grep -qi uptime; then
    cli_ready=1
    break
  fi
  sleep 2
done

if [ "$cli_ready" -ne 1 ]; then
  echo "[asterisk] FATAL: Asterisk CLI not ready within 30s"
  kill "$ASTERISK_PID" 2>/dev/null || true
  exit 1
fi

"$AST_BIN" -rx "module reload res_http_websocket.so" 2>&1 | tail -2 || true
"$AST_BIN" -rx "module reload res_pjsip_transport_websocket.so" 2>&1 | tail -2 || true
"$AST_BIN" -rx "module reload res_pjsip.so" 2>&1 | tail -2 || true
"$AST_BIN" -rx "pjsip reload" 2>&1 | tail -3 || true
sleep 4

if ! verify_pjsip_runtime; then
  echo "[asterisk] FATAL: PJSIP/WebSocket stack not ready — refusing to run broken SIP"
  kill "$ASTERISK_PID" 2>/dev/null || true
  wait "$ASTERISK_PID" 2>/dev/null || true
  exit 1
fi

wait "$ASTERISK_PID"
exit $?
