# Asterisk configuration

PJSIP is **split across multiple files** at container start (`docker-entrypoint.sh`) so `[1001]` can be both AOR and endpoint without INI merge bugs. **`sorcery.conf` is rewritten every start** so Asterisk never falls back to the missing `pjsip.conf`.

## Layout

```
pjsip.aor.conf       → [1001] type=aor
pjsip.endpoint.conf  → [1001] type=endpoint, aors=1001
pjsip.auth.conf      → [1001-auth] type=auth
pjsip.transport.conf → [transport-wss]
pjsip.global.conf    → default_realm=${ASTERISK_EXTERNAL_IP}
sorcery.conf         → maps each file; contact=memory
```

REGISTER chain:

```
REGISTER To: 1001@13.62.237.148
  → endpoint [1001]   aors=1001
  → aor [1001]        max_contacts=5
  → auth [1001-auth]
  → contacts stored in memory (not astdb)
```

Do **not** use `aors=1001-aor` or a single `pjsip.conf` with two `[1001]` blocks — Asterisk merges duplicate section names and drops the AOR.

## Deploy

```bash
docker compose build --no-cache asterisk
docker compose up -d --force-recreate asterisk
bash scripts/check-asterisk-sip.sh
```

`docker compose up` alone reuses a cached image — always **`build --no-cache asterisk`** after config changes.

Startup must log: `PJSIP ready — AOR 1001 + endpoint 1001 + transport-wss + contact=memory`

## Verify

```bash
docker exec -it voxera-asterisk cat /etc/asterisk/pjsip.aor.conf
docker exec -it voxera-asterisk cat /etc/asterisk/pjsip.endpoint.conf
docker exec -it voxera-asterisk asterisk -rx "pjsip show aor 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show endpoint 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show contacts"
docker exec -it voxera-asterisk asterisk -rx "pjsip set logger on"
```

After REGISTER: `pjsip show contacts` → `1001/sip:...@... OK` (no `Unable to bind contact` in logs).
