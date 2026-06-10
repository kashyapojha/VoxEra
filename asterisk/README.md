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
  → auth [1001-auth]       (endpoint auth=1001-auth)
  → aor [1001] type=aor    (listed BEFORE endpoint — same section name, different type=)
  → endpoint [1001]        (aors=1001 — must match REGISTER username, not 1001-aor)
  → transport transport-wss (if missing: WebSocket connects but REGISTER times out)
```

`modules.conf` is copied into the image (preload `res_pjsip`, `res_http_websocket`, `res_pjsip_transport_websocket`, `chan_pjsip`). Without it, WS connects but SIP REGISTER gets no response.

## Deploy (rebuild required)

`docker restart` and `docker compose up -d` alone do **not** pick up template changes — the template is **baked into the image** at build time.

```bash
docker compose --env-file .env.production build asterisk
docker compose --env-file .env.production up -d asterisk
```

On EC2, `scripts/deploy-ec2.sh` runs `build asterisk` on every deploy. If you deploy manually, always include `--build`.

Check startup logs for:

```text
[asterisk] endpoint aors: aors=1001
[asterisk] PJSIP ready — endpoint 1001 + AOR 1001 + transport-wss loaded
```

## Verify

```bash
docker exec -it voxera-asterisk cat /etc/asterisk/pjsip.conf
docker exec -it voxera-asterisk asterisk -rx "pjsip show endpoint 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show aor 1001"
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
