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

`modules.conf` must include `autoload = yes` (this file **replaces** the base image `modules.conf`) and preload the WebSocket stack:

- `preload => res_http_websocket.so` — registers `/ws` on the HTTP server (without it, `ws://host:8089/ws` returns **404** and the browser shows “WebSocket connection failed”)
- `preload => res_pjsip_transport_websocket.so` — PJSIP over WebSocket

`noload => chan_sip.so` — if **chan_sip** stays loaded, it can answer WebSocket REGISTER before **res_pjsip**, causing **401 Unauthorized** even with password `1001` and correct `pjsip.conf`.

Mounted volumes: `pjsip.conf.template`, `http.conf.template`, `modules.conf`, `sorcery.conf`, `extconfig.conf`, `extensions.conf`, `rtp.conf`, `logs/`. After `git pull`, `docker compose up -d asterisk` picks up template changes without rebuilding the image.

## PJSIP object chain (REGISTER)

```
REGISTER From/To: 1001@13.62.237.148
  → endpoint [1001]              (only one [1001] section — REGISTER matches this name)
  → aor [1001@13.62.237.148]     (unique section name; endpoint aors=1001@13.62.237.148)
  → auth [1001-auth]
  → transport transport-wss
```

**Never** use two `[1001]` blocks (`type=aor` + `type=endpoint`). Asterisk merges duplicate section names into one category — the AOR is silently dropped → `Unable to find object 1001`.

`modules.conf` is copied into the image (preload PJSIP + WebSocket modules). Without it, WebSocket connects but REGISTER times out.

`sorcery.conf` uses `contact=memory` (not `astdb`) — otherwise REGISTER returns 200 OK but logs `Unable to bind contact` and JsSIP never shows registered.

## Deploy (rebuild required)

`docker restart` and `docker compose up -d` alone do **not** pick up template changes — the template is **baked into the image** at build time.

```bash
docker compose --env-file .env.production build asterisk
docker compose --env-file .env.production up -d asterisk
```

On EC2, `scripts/deploy-ec2.sh` runs `build asterisk` on every deploy. If you deploy manually, always include `--build`.

Check startup logs for:

```text
[asterisk] endpoint aors: aors=1001@13.62.237.148
[asterisk] PJSIP ready — endpoint 1001 + AOR 1001@13.62.237.148 + transport-wss
```

## Verify

```bash
docker exec -it voxera-asterisk cat /etc/asterisk/pjsip.conf
docker exec -it voxera-asterisk asterisk -rx "pjsip show endpoint 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show aor 1001@YOUR_PUBLIC_IP"
docker exec -it voxera-asterisk asterisk -rx "pjsip show transport transport-wss"
docker exec -it voxera-asterisk asterisk -rx "pjsip show auth 1001-auth"
docker exec -it voxera-asterisk asterisk -rx "pjsip show contacts"
docker exec -it voxera-asterisk asterisk -rx "pjsip set logger on"
```

Expected after successful REGISTER:

- `pjsip show endpoint 1001` → `aors: 1001`, `inbound_auth: 1001-auth/1001`
- `pjsip show contacts` → `1001/sip:...@... OK`

## WebSocket port

Port **8089** with `protocol=ws` and `ws://host:8089/ws` is correct for this setup (no TLS). You do not need a separate 8088 transport unless you want plain WS on a second port.

## dtls_verify at runtime

`webrtc=yes` may force `dtls_verify=Yes` in Asterisk regardless of `dtls_verify=fingerprint` in config. This affects media only, not REGISTER digest auth.
