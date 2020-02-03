FROM alpine:3.11.3
RUN apk add --no-cache vim py-pip python curl build-base libc6-compat npm nodejs && \
    npm install -g firebase-tools

# Download and install hugo
ENV HUGO_VERSION 0.63.2
ENV HUGO_BINARY hugo_extended_${HUGO_VERSION}_Linux-64bit.tar.gz
ENV PS1='\[\033[1;36m\]\u\[\033[1;31m\]@\[\033[1;32m\]\h:\[\033[1;35m\]\w\[\033[1;31m\]\$\[\033[0m\] '

# Install Hugo.
RUN curl -Lo /tmp/${HUGO_BINARY} https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${HUGO_BINARY} \
    && tar xzf /tmp/${HUGO_BINARY} -C /usr/local/bin \
    && rm -rf /tmp/*

# Create working directory
VOLUME /app
WORKDIR /app

# Add sources.
ADD src/ /app

# By default, serve site.
EXPOSE 1313 35729
CMD hugo server --bind 0.0.0.0
