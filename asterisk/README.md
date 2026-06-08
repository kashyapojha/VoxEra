# Asterisk configuration

`pjsip.conf` is **always regenerated** at container start by `docker-entrypoint.sh` from `pjsip.conf.template`. There is no static `pjsip.conf` in the repo.

## Startup flow

```
docker-entrypoint.sh
  → envsubst ASTERISK_EXTERNAL_IP, ASTERISK_WS_PORT
  → writes /etc/asterisk/pjsip.conf (overwrites any base-image file)
  → removes pjsip_wizard.conf if present
  → exec asterisk -f
```

`sorcery.conf` and `extconfig.conf` pin PJSIP to static file config (no realtime `ps_*` override from the base image).

Mounted volumes: `pjsip.conf.template`, `http.conf.template`, `sorcery.conf`, `extconfig.conf`, `extensions.conf`, `rtp.conf`, `logs/`. After `git pull`, `docker compose up -d asterisk` picks up template changes without rebuilding the image.

## PJSIP object chain (REGISTER)

```
REGISTER From/To: 1001@13.62.237.148
  → endpoint [1001]     (name = From username)
  → auth [1001]         (auth=1001 on endpoint)
  → aor [1001]          (aors=1001 — MUST match To username)
```

All three sections use the same name `[1001]` with different `type=` values. Do **not** use `1001-aor` or `1001-auth` — the registrar matches the REGISTER username against `aors=` names; a mismatch yields `AOR '' not found` and 404.

## Deploy (rebuild required)

`docker restart` and `docker compose up -d` alone do **not** pick up template changes — the template is **baked into the image** at build time.

```bash
docker compose --env-file .env.production build asterisk
docker compose --env-file .env.production up -d asterisk
```

On EC2, `scripts/deploy-ec2.sh` runs `build asterisk` on every deploy. If you deploy manually, always include `--build`.

Check startup logs for:

```text
[asterisk] endpoint [1001] aors: aors=1001
[asterisk] endpoint [1001] auth: auth=1001
```

## Verify

```bash
docker exec -it voxera-asterisk cat /etc/asterisk/pjsip.conf
docker exec -it voxera-asterisk asterisk -rx "pjsip show endpoint 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show aor 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show auth 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show contacts"
docker exec -it voxera-asterisk asterisk -rx "pjsip set logger on"
```

Expected after successful REGISTER:

- `pjsip show endpoint 1001` → `aors: 1001`, `auth: 1001/1001`
- `pjsip show contacts` → `1001/sip:...@... OK`

## WebSocket port

Port **8089** with `protocol=ws` and `ws://host:8089/ws` is correct for this setup (no TLS). You do not need a separate 8088 transport unless you want plain WS on a second port.

## dtls_verify at runtime

`webrtc=yes` may force `dtls_verify=Yes` in Asterisk regardless of `dtls_verify=fingerprint` in config. This affects media only, not REGISTER digest auth.
