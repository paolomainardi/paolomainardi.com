FROM alpine:3.17
RUN apk add --no-cache vim py-pip python3 curl build-base libc6-compat go git nodejs npm

# Download and install hugo
ARG TARGETARCH
ENV HUGO_VERSION 0.109.0
ENV HUGO_LYRA_VERSION 0.4.1

# ENV HUGO_BINARY hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz
ENV PS1='\[\033[1;36m\]\u\[\033[1;31m\]@\[\033[1;32m\]\h:\[\033[1;35m\]\w\[\033[1;31m\]\$\[\033[0m\] '

# Install Hugo.
RUN if [ $TARGETARCH == 'arm64' ]; then  \
      export HUGO_BINARY=hugo_extended_${HUGO_VERSION}_Linux-ARM64.tar.gz; \
    else \
      export HUGO_BINARY=hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz; \
    fi && \
    curl -Lo /tmp/${HUGO_BINARY} https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${HUGO_BINARY} \
    && tar xzf /tmp/${HUGO_BINARY} -C /usr/local/bin \
    && rm -rf /tmp/*

# Install firebase cli.
RUN npm install -g firebase-tools hugo-lyra@${HUGO_LYRA_VERSION}

# Add sources.
WORKDIR /app
ADD src/ .

# By default, serve site.
EXPOSE 1313 35729
CMD hugo server --bind 0.0.0.0


