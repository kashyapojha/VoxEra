FROM andrius/asterisk:latest

RUN apk add --no-cache gettext || \
    (apt-get update && apt-get install -y --no-install-recommends gettext-base && rm -rf /var/lib/apt/lists/*) || true

COPY pjsip.conf.template /etc/asterisk/templates/pjsip.conf.template
COPY extensions.conf /etc/asterisk/extensions.conf
COPY rtp.conf /etc/asterisk/rtp.conf
COPY http.conf /etc/asterisk/http.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN mkdir -p /var/log/asterisk && \
    chmod +x /docker-entrypoint.sh && \
    chown -R asterisk:asterisk /etc/asterisk /var/log/asterisk 2>/dev/null || true

EXPOSE 8088 5060/udp

ENTRYPOINT ["/docker-entrypoint.sh"]
