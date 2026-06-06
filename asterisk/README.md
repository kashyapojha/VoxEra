# Asterisk configuration

`pjsip.conf` and `http.conf` are generated at container start from `*.conf.template` using `ASTERISK_EXTERNAL_IP` and `ASTERISK_WS_PORT` (default **8089**; see `docker-entrypoint.sh`).

- **Local:** `ASTERISK_EXTERNAL_IP=127.0.0.1` (`.env.local`)
- **Production:** set to your Elastic IP in `.env.production`

Do not edit a static `pjsip.conf` in the repo; change the template or the environment variable.
