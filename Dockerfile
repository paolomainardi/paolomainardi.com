FROM node:bullseye-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    golang \
    vim \
    sudo \
    locales \
    bash-completion \
    && rm -rf /var/lib/apt/lists/*

ENV PS1='\[\033[1;36m\]\u\[\033[1;31m\]@\[\033[1;32m\]\h:\[\033[1;35m\]\w\[\033[1;31m\]\$\[\033[0m\] '

# Add node user to sudoers.
# Refs: https://code.visualstudio.com/remote/advancedcontainers/add-nonroot-user#_creating-a-nonroot-user
RUN echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

# Configure locale.
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# Install oh-my-bash and configure locale.
ARG USERNAME=node
RUN su -c bash -c "$(curl -fsSL https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh)" $USERNAME && \
    sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen

# Set custom aliases.
RUN echo "alias dc=docker-compose" >> /etc/bash.bashrc

# Enable bash completion system-wide
RUN echo '[ -f /usr/share/bash-completion/bash_completion ] && . /usr/share/bash-completion/bash_completion' >> /etc/bash.bashrc

# Install global node dependencies.
ENV HUGO_LYRA_VERSION 0.4.2
RUN npm install -g firebase-tools hugo-lyra@${HUGO_LYRA_VERSION}

# Install Hugo.
ARG BUILDARCH
COPY .env /.env
RUN . /.env && \
    export HUGO_BINARY=hugo_extended_${HUGO_VERSION}_linux-${BUILDARCH}.tar.gz; \
    curl -Lo /tmp/${HUGO_BINARY} https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${HUGO_BINARY} \
    && tar xzf /tmp/${HUGO_BINARY} -C /usr/local/bin \
    && rm -rf /tmp/*

# By default, serve site.
CMD hugo server --bind 0.0.0.0


