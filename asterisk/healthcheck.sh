#!/bin/sh
# Minimal healthcheck — Asterisk CLI only (no pgrep/wget/curl dependencies).
AST_BIN="/usr/sbin/asterisk"
[ -x "$AST_BIN" ] || AST_BIN="asterisk"

for _ in 1 2 3 4 5; do
  OUT="$("$AST_BIN" -rx 'pjsip show endpoint 1001' 2>&1)" || OUT=""
  case "$OUT" in
    *Unable\ to\ find*|*Unable\ to\ connect*) ;;
    *1001*)
      OUT="$("$AST_BIN" -rx 'pjsip show aor 1001' 2>&1)" || OUT=""
      case "$OUT" in
        *Unable\ to\ find*|*Unable\ to\ connect*) ;;
        *1001*) exit 0 ;;
      esac
    ;;
  esac
  sleep 2
done
exit 1
