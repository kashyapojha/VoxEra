#!/bin/sh
# Minimal healthcheck — Asterisk CLI only (no pgrep/wget/curl dependencies).
AST_BIN="/usr/sbin/asterisk"
[ -x "$AST_BIN" ] || AST_BIN="asterisk"
OUT="$("$AST_BIN" -rx 'pjsip show endpoint 1001' 2>&1)" || exit 1
case "$OUT" in
  *Unable\ to\ find*) exit 1 ;;
  *1001*) ;;
  *) exit 1 ;;
esac
OUT="$("$AST_BIN" -rx 'pjsip show aor 1001' 2>&1)" || exit 1
case "$OUT" in
  *Unable\ to\ find*) exit 1 ;;
  *1001*) exit 0 ;;
  *) exit 1 ;;
esac
