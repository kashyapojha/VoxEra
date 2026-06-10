FROM andrius/asterisk:22

ARG CONFIG_REVISION=5
RUN echo "asterisk config revision: ${CONFIG_REVISION}"

RUN if command -v apk >/dev/null 2>&1; then \
      apk add --no-cache wget curl findutils; \
    else \
      apt-get update && \
      apt-get install -y --no-install-recommends wget curl findutils && \
      rm -rf /var/lib/apt/lists/*; \
    fi

# Keep the base image modules.conf/sorcery.conf — replacing them broke PJSIP object loading.
# Only ensure chan_sip stays unloaded (WebSocket REGISTER must hit res_pjsip).
RUN if [ -f /etc/asterisk/modules.conf ]; then \
      grep -q 'chan_sip' /etc/asterisk/modules.conf \
        || printf '\n; VoxEra\nnoload => chan_sip.so\n' >> /etc/asterisk/modules.conf; \
    fi

RUN set -e; \
    for mod in res_pjsip res_http_websocket res_pjsip_transport_websocket chan_pjsip; do \
      found="$(find /usr -name "${mod}.so" 2>/dev/null | head -1)"; \
      if [ -z "$found" ]; then \
        echo "BUILD FAIL: ${mod}.so not found in base image"; \
        exit 1; \
      fi; \
      echo "found ${mod}.so at ${found}"; \
    done

COPY extensions.conf /etc/asterisk/extensions.conf
COPY rtp.conf /etc/asterisk/rtp.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY healthcheck.sh /usr/local/bin/asterisk-healthcheck.sh

RUN rm -f /etc/asterisk/pjsip.conf /etc/asterisk/pjsip_wizard.conf 2>/dev/null || true && \
    mkdir -p /var/log/asterisk /var/run/asterisk && \
    chmod +x /docker-entrypoint.sh /usr/local/bin/asterisk-healthcheck.sh && \
    chown -R asterisk:asterisk /etc/asterisk /var/log/asterisk /var/run/asterisk 2>/dev/null || true

EXPOSE 5060/udp 5060/tcp 8088 8089 10000-20000/udp

ENTRYPOINT ["/docker-entrypoint.sh"]
