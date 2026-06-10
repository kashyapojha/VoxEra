#!/bin/sh
AST_BIN="/usr/sbin/asterisk"
[ -x "$AST_BIN" ] || AST_BIN="asterisk"

for _ in 1 2 3 4 5; do
  EP="$("$AST_BIN" -rx 'pjsip show endpoint 1001' 2>&1)" || EP=""
  AOR="$("$AST_BIN" -rx 'pjsip show aor 1001' 2>&1)" || AOR=""
  TP="$("$AST_BIN" -rx 'pjsip show transport transport-wss' 2>&1)" || TP=""
  case "$EP" in
    *Unable\ to\ find*|*Unable\ to\ connect*) ;;
    *1001*)
      case "$AOR" in
        *Unable\ to\ find*|*Unable\ to\ connect*) ;;
        *1001*)
          case "$TP" in
            *Unable\ to\ find*|*Unable\ to\ connect*) ;;
            *transport-wss*) exit 0 ;;
          esac
        ;;
      esac
    ;;
  esac
  sleep 2
done
exit 1
