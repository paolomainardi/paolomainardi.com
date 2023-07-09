+++
date = "2023-03-24"
title = "How to make a process running in a container feel at home"
slug = "container-process-feel-at-home"
tags = ["docker"]
featuredImage = "/images/posts/5-docker-native/container-living-room.webp"
images = ["/images/posts/5-docker-native/container-living-room.webp"]
+++

If you know me, you know how much I love the container ecosystem (and Docker) and how breakthrough they have been in the market the last 10 years, containers changed everything.

Even tho Docker/Podman have become an essential tool in the world of software development, as they allow developers to create, deploy and run applications in containers, sometimes a process needs more than just a container to run; maybe it assumes something from the env vars or a system socket (e.g., like X11).

Another scenario can be that you need to run something from your CI job, maybe Gitlab, and you want to run a custom container with the same env vars of the host (config, secrets manually set on the project), for example:

```yaml
image: gitlab-ci-base-image:latest

phpunit:
  script: |
          docker run --rm -it \
          -e CI_COMMIT_REF_SLUG=$CI_COMMIT_REF_SLUG \
          -e MY_CUSTOM_CONFIG=$MY_CUSTOM_CONFIG \
          # all the other hardwired variables i know (i can miss something here). \
          php:8.2 php tests.php
```

So, assuming that an entire system is not just a filesystem with a bunch of binaries, to let the process behave more like running inside the host, we need, at minimum, the following stuff:

* Hostname
* User's home and a user with the same `uid:gid`
* Env vars
* X11 socket to run gui apps (optional)2

## Solution

So i condensated everything in a small script i use regularly:

```shell
#!/bin/sh
#!/bin/sh

if [ -z "$DOCKER_IMAGE" ]; then
    echo "DOCKER_IMAGE is not set"
    exit 1
fi

# Operating system type.
OS_TYPE=$(uname -s)

# Operating system hostname.
HOSTNAME=$(hostname)

# Check the operating system type to mount the docker socket.
if [ "$OS_TYPE" = "Linux" ]; then
    DOCKER_SOCKET=/var/run/docker.sock
elif [ "$OS_TYPE" = "Darwin" ]; then
    DOCKER_SOCKET=/var/run/docker.sock.raw
fi

if [ -n "${CI}" ]; then
    INTERACTIVE=""
else
    INTERACTIVE="-it"
fi

# Use the configured USER_ID. If empty use the current user id.
USER_ID=${USER_ID:-$(id -u)}

# Pass dynamic arguments to the docker container.
# Cycle env vars and pass them to the docker container.
docker_env_vars=""
for env_var in $(env); do
    docker_env_vars="${docker_env_vars} -e $env_var"
done

# Run the docker container. The container will be removed after the execution.
docker run --rm ${INTERACTIVE} \
${docker_env_vars[@]} \
-h "${HOSTNAME}" \
--net=host \
--user "${USER_ID}" \
-e SHELL=/bin/sh \
-v "${HOME}":"${HOME}" \
-v "${PWD}":"${PWD}" \
-v /tmp:/tmp \
-w "${PWD}" \
-v "${DOCKER_SOCKET}":/var/run/docker.sock:ro \
-v /var/run:/var/run:rw \
-v /sys:/sys:ro \
-v /tmp/.X11-unix:/tmp/.X11-unix \
"${DOCKER_IMAGE}" "${@}"
```

How it works? Let's break down the code and understand each part of the script:

1. Check if the DOCKER_IMAGE variable is set: The script checks if the required DOCKER_IMAGE variable is set. If not, it prints an error message and exits the script.

```shell
if [ -z "$DOCKER_IMAGE" ]; then
    echo "DOCKER_IMAGE is not set"
    exit 1
fi
```

2. Pass dynamic arguments to the Docker container: The script iterates through the environment variables using env and dynamically adds them as arguments to the docker run command.

```shell
docker_env_vars=""
for env_var in $(env); do
    docker_env_vars="${docker_env_vars} -e $env_var"
done
```

Some critical flags used in the docker run command include:

* -`-rm`: Automatically removes the container after it finishes executing.
* `-it`: Allocates a TTY and keeps STDIN open for interactive use.
* `${docker_env_vars[@]}`: Passes the dynamically collected environment variables to the * container.
* `-h "${HOSTNAME}"`: Sets the container's hostname to match the host system.
* `--net=host`: Uses the host network, so you can access local services from inside the container as a normal process can.
* `-v /var/run/docker.sock:/var/run/docker.sock:ro`: Mount the docker.sock to use Docker inside * the container.
* `-v /tmp/.X11-unix:/tmp/.X11-unix`: Mount X11 socket to run GUI apps.
* Mount system paths: `/var/run, /tmp, /sys` to match the host parity

I keep it the process inside on `/usr/local/bin/e` and i use it for things like running a specific version of PHP:

```shell
DOCKER_IMAGE=php:8.2 e
Interactive shell
php >
```

Or, for running GUI apps, I want to avoid installing them on my system.

**Beware** that this solution cannot cover more sophisticated cases; there are better solutions, like [Distrobox](https://github.com/89luca89/distrobox).

That's it, if I am missing something big or you want to discuss it, as always, drop me a message on the contacts you can find [here](/about) or drop me a message on [Mastodon](https://continuousdelivery.social/@paolomainardi).
