#!/bin/sh
AST_BIN="/usr/sbin/asterisk"
[ -x "$AST_BIN" ] || AST_BIN="asterisk"
AOR_ID="1001@${ASTERISK_EXTERNAL_IP:-127.0.0.1}"

for _ in 1 2 3 4 5; do
  EP="$("$AST_BIN" -rx 'pjsip show endpoint 1001' 2>&1)" || EP=""
  AOR="$("$AST_BIN" -rx "pjsip show aor ${AOR_ID}" 2>&1)" || AOR=""
  case "$EP" in
    *Unable\ to\ find*|*Unable\ to\ connect*) ;;
    *1001*)
      case "$AOR" in
        *Unable\ to\ find*|*Unable\ to\ connect*) ;;
        *1001@*) exit 0 ;;
      esac
    ;;
  esac
  sleep 2
done
exit 1
