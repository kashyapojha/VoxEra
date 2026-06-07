# Asterisk configuration

`pjsip.conf` is generated at container start from `pjsip.conf.template` via `ASTERISK_EXTERNAL_IP` and `ASTERISK_WS_PORT`.

- **Local:** `ASTERISK_EXTERNAL_IP=127.0.0.1`
- **Production:** `ASTERISK_EXTERNAL_IP=13.62.237.148` (your Elastic IP)

See `pjsip.conf.production.example` for a fully resolved reference.

## PJSIP object resolution chain (REGISTER)

```
REGISTER (digest username=1001)
  → auth_username lookup → [1001-auth]  (username=1001, realm=ASTERISK_EXTERNAL_IP)
  → endpoint             → [1001-endpoint] (auth=1001-auth, identify_by=auth_username)
  → contact binding      → [1001] AOR      (aors=1001)
```

All three names are intentional and different:

| Object | Name | Role |
|--------|------|------|
| AOR | `1001` | stores REGISTER contact |
| Auth | `1001-auth` | digest credentials |
| Endpoint | `1001-endpoint` | WebRTC/media profile |

Dialplan uses `PJSIP/1001-endpoint` (not `PJSIP/1001`) — see `extensions.conf`.

## Expected SIP flow

```
REGISTER (no auth) → 401 (realm = ASTERISK_EXTERNAL_IP)
REGISTER (digest)  → 200 OK
```

## Deploy + reset auth cache (required after config change)

```bash
docker compose --env-file .env.production up --build asterisk
docker exec -it voxera-asterisk asterisk -rx "pjsip reload"
docker exec -it voxera-asterisk asterisk -rx "module reload res_pjsip_authenticator_digest.so"
```

Hard reset if digest failures persist:

```bash
docker restart voxera-asterisk
```

## Verify objects

```bash
docker exec -it voxera-asterisk asterisk -rx "pjsip show auth 1001-auth"
docker exec -it voxera-asterisk asterisk -rx "pjsip show endpoint 1001-endpoint"
docker exec -it voxera-asterisk asterisk -rx "pjsip show aor 1001"
docker exec -it voxera-asterisk asterisk -rx "pjsip show transports"
```

Expected:

| Object | Key fields |
|--------|------------|
| `1001-auth` | `username=1001`, `realm=13.62.237.148` |
| `1001-endpoint` | `auth=1001-auth`, `aors=1001`, `identify_by=auth_username` |
| `1001` (AOR) | `max_contacts=5`, contacts appear after 200 OK |

## Debug digest failures

```bash
docker exec -it voxera-asterisk asterisk -rx "pjsip set logger on"
docker exec -it voxera-asterisk asterisk -rx "pjsip set history on"
docker exec -it voxera-asterisk asterisk -rvvv
```

Then register from JsSIP and look in Asterisk console/logs for:

- `Failed to authenticate` — digest verify failed (check auth ↔ endpoint binding)
- `Couldn't find auth` — username/realm mismatch on auth object
- `No matching endpoint found` — identify_by / endpoint_identifier_order issue

## Root cause (when password is correct but auth still fails)

JsSIP sends valid credentials, Asterisk finds the endpoint, but digest verification fails because the **PJSIP object resolution path** (`auth_username` → `auth` → `endpoint` → `aor`) was ambiguous. `identify_by=username` (From header) does not match `endpoint_identifier_order=auth_username` (Authorization header) — use `identify_by=auth_username` on the endpoint and explicit `realm=` on the auth object matching `default_realm`.
