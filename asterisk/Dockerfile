FROM debian:bookworm-slim

ENV ASTERISK_VERSION=22.9.0

# =========================
# Install build dependencies
# =========================
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    curl \
    git \
    subversion \
    pkg-config \
    libjansson-dev \
    libxml2-dev \
    libsqlite3-dev \
    uuid-dev \
    libssl-dev \
    libedit-dev \
    libncurses5-dev \
    libcurl4-openssl-dev \
    libopus-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# =========================
# Create asterisk user
# =========================
RUN useradd -m -d /var/lib/asterisk -s /bin/bash asterisk

WORKDIR /usr/src

# =========================
# Download Asterisk source
# =========================
RUN wget -q http://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz && \
    tar -xzf asterisk-${ASTERISK_VERSION}.tar.gz

WORKDIR /usr/src/asterisk-${ASTERISK_VERSION}

# =========================
# Configure + enable PJSIP + WebSocket transport
# =========================
RUN ./configure --with-jansson-bundled --with-pjproject-bundled && \
    make menuselect.makeopts && \
    menuselect/menuselect \
        --enable res_pjsip \
        --enable res_pjsip_session \
        --enable chan_pjsip \
        --enable res_pjsip_logger \
        --enable res_pjproject \
        --enable res_http_websocket \
        --enable res_pjsip_transport_websocket \
        --enable codec_opus \
        menuselect.makeopts && \
    make -j"$(nproc)" && \
    make install && \
    make samples && \
    make config && \
    ldconfig

# =========================
# Runtime tools (envsubst for templates)
# =========================
RUN apt-get update && apt-get install -y --no-install-recommends \
    gettext-base \
    libopus0 \
    && rm -rf /var/lib/apt/lists/*

# =========================
# VoxEra config + entrypoint
# =========================
COPY pjsip.conf.template /etc/asterisk/templates/pjsip.conf.template
COPY http.conf.template /etc/asterisk/templates/http.conf.template
COPY modules.conf /etc/asterisk/modules.conf
COPY sorcery.conf /etc/asterisk/sorcery.conf
COPY extconfig.conf /etc/asterisk/extconfig.conf
COPY extensions.conf /etc/asterisk/extensions.conf
COPY rtp.conf /etc/asterisk/rtp.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN mkdir -p /var/log/asterisk /etc/asterisk/templates && \
    chmod +x /docker-entrypoint.sh && \
    chown -R asterisk:asterisk /var/lib/asterisk /var/log/asterisk 2>/dev/null || true

# =========================
# Expose SIP + WebRTC ports
# =========================
EXPOSE 5060/udp 5060/tcp 8088 8089 10000-20000/udp

ENTRYPOINT ["/docker-entrypoint.sh"]
