# Asterisk configuration

`pjsip.conf` is generated at container start from `pjsip.conf.template` using `ASTERISK_EXTERNAL_IP` (see `docker-entrypoint.sh`).

- **Local:** `ASTERISK_EXTERNAL_IP=127.0.0.1` (`.env.local`)
- **Production:** set to your Elastic IP in `.env.production`

Do not edit a static `pjsip.conf` in the repo; change the template or the environment variable.
