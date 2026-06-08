# Asterisk configuration

`pjsip.conf` is **always regenerated** at container start by `docker-entrypoint.sh` from `pjsip.conf.template`. There is no static `pjsip.conf` in the repo.

## Startup flow

```
docker-entrypoint.sh
  → envsubst ASTERISK_EXTERNAL_IP, ASTERISK_WS_PORT
  → writes /etc/asterisk/pjsip.conf (overwrites any base-image file)
  → exec asterisk -f
```

Mounted volumes (do **not** include pjsip.conf): `extensions.conf`, `rtp.conf`, `logs/`.

No `sorcery.conf` or `extconfig.conf` in this repo — if the base image ships realtime backends, verify with `asterisk -rx "sorcery show caches"` on the running container.

## PJSIP object chain (REGISTER)

```
REGISTER From: 1001@13.62.237.148
  → endpoint [1001]           (name MUST match From username on 1st REGISTER)
  → auth [1001-auth]          (username=1001, realm=ASTERISK_EXTERNAL_IP)
  → aor [1001]                (name MUST match REGISTER username for contact binding)
```

## Deploy

```bash
# .env.production must set:
# ASTERISK_EXTERNAL_IP=13.62.237.148

docker compose --env-file .env.production up --build asterisk
docker exec -it voxera-asterisk asterisk -rx "pjsip reload"
docker restart voxera-asterisk   # if digest cache is stale
```

## Verify

```bash
docker exec -it voxera-asterisk cat /etc/asterisk/pjsip.conf
docker exec -it voxera-asterisk asterisk -rx "pjsip show auth 1001-auth"
docker exec -it voxera-asterisk asterisk -rx "pjsip show endpoint 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show aor 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show contacts"
docker exec -it voxera-asterisk asterisk -rx "pjsip set logger on"
```

Expected after successful REGISTER:

- `1001-auth` → `realm=13.62.237.148` (not empty)
- `pjsip show endpoint 1001` → `InAuth: 1001-auth/1001`
- `pjsip show contacts` → contact for `1001`

## dtls_verify=Yes at runtime

`webrtc=yes` forces `dtls_verify=Yes` in Asterisk regardless of `dtls_verify=no` in config. This affects media only, not REGISTER digest auth.
