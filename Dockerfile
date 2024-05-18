FROM node:bullseye-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    golang \
    vim \
    && rm -rf /var/lib/apt/lists/*

ENV PS1='\[\033[1;36m\]\u\[\033[1;31m\]@\[\033[1;32m\]\h:\[\033[1;35m\]\w\[\033[1;31m\]\$\[\033[0m\] '

# Install global node dependencies.
ENV HUGO_LYRA_VERSION 0.4.2
RUN npm install -g firebase-tools hugo-lyra@${HUGO_LYRA_VERSION}

# Install Hugo.
ENV HUGO_VERSION 0.126.1
ARG BUILDARCH
RUN export HUGO_BINARY=hugo_extended_${HUGO_VERSION}_linux-${BUILDARCH}.tar.gz; \
    curl -Lo /tmp/${HUGO_BINARY} https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${HUGO_BINARY} \
    && tar xzf /tmp/${HUGO_BINARY} -C /usr/local/bin \
    && rm -rf /tmp/*

# Add sources.
WORKDIR /app
ADD src/ .

# By default, serve site.
EXPOSE 1313 35729
CMD hugo server --bind 0.0.0.0


