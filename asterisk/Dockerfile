FROM andrius/asterisk:22

# envsubst for pjsip.conf / http.conf at container start; wget/curl for deploy diagnostics only.
RUN if command -v apk >/dev/null 2>&1; then \
      apk add --no-cache gettext wget curl; \
    else \
      apt-get update && \
      apt-get install -y --no-install-recommends gettext-base wget curl && \
      rm -rf /var/lib/apt/lists/*; \
    fi

COPY pjsip.conf.template /etc/asterisk/templates/pjsip.conf.template
COPY http.conf.template /etc/asterisk/templates/http.conf.template
COPY modules.conf /etc/asterisk/modules.conf
COPY sorcery.conf /etc/asterisk/sorcery.conf
COPY extconfig.conf /etc/asterisk/extconfig.conf
COPY extensions.conf /etc/asterisk/extensions.conf
COPY rtp.conf /etc/asterisk/rtp.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY healthcheck.sh /usr/local/bin/asterisk-healthcheck.sh

RUN rm -f /etc/asterisk/pjsip.conf /etc/asterisk/pjsip_wizard.conf 2>/dev/null || true && \
    mkdir -p /var/log/asterisk /var/run/asterisk /etc/asterisk/templates && \
    chmod +x /docker-entrypoint.sh /usr/local/bin/asterisk-healthcheck.sh && \
    chown -R asterisk:asterisk /etc/asterisk /var/log/asterisk /var/run/asterisk 2>/dev/null || true

EXPOSE 5060/udp 5060/tcp 8088 8089 10000-20000/udp

ENTRYPOINT ["/docker-entrypoint.sh"]
