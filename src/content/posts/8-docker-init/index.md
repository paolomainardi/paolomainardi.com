+++
date = "2023-12-12"
title = "docker run --init: to the rescue of zombie processes"
slug = "docker-run-init"
tags = ["docker", "short"]
draft = "false"
featuredImage = "/images/posts/8-docker-run/docker-run-init.webp"
images = ["/images/posts/8-docker-run/docker-run-init.webp"]
+++

This is a short post to remind myself that is always time to learn something new or to refresh memories that sit there in the back of your head, maybe wrong, maybe right. In this case, they were very wrong.

I was building a Docker image to be used both as a development environment and as a cli tool. To simplify it, it was something like this:

```dockerfile
FROM node:20-lts

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

The entrypoint script was something like this:

```bash
#!/bin/bash
set -eo pipefail
shopt -s nullglob
BASE=${PWD}

if [[ "${1}" == 'yarn' || "${1}" == "npm" ]]; then
  echo "Installing npm libraries....."
  yarn install --frozen-lockfile
  echo "...done\n"
fi

cd ${BASE}
exec "$@"
```

The idea was to install the dependencies if the first argument was `yarn` or `npm` and then execute the command passed as arguments. It works fine, i use this approach since years and never had any problem, till today.

I was running a `yarn install` command that was taking longer then expected, so i tried to stop it with sending a SIGINT signal (ctrl-c) but it didn't work.

I double checked the entrypoint to be sure that `exec` was there, and it was and this is the moment when I started to think that i didn't have really understood how `exec` works under the hood, i was quite sure that `exec` was enough to do all the signals plumbing.

I started then to write some small test cases to reproduce the issue:

```bash
❯ docker run --rm -it busybox sh -c "sleep 5;"
^C^C^C^C^C^C^C^C^C%

❯ docker run --rm -it node:lts node -e "setTimeout(function() {}, 5000);"
^C^C^C^C^C^C^C^C^C%

❯ docker run --rm -it php:8 php -r "sleep(5);"
^C%
```
The result here is that:

1. the `sleep` command is not interrupted
2. the `node` command is not interrupted
3. the `php` command is interrupted

The answer is that the `node` and `sleep` command do not have any form of signal handling, so they are not interrupted, while the `php` command has a signal handling and it is interrupted.
So, if the command that you are running in your container does not have a signal handling, it will not be interrupted, and this is where i found the `node` doesn't have it, while `php` does. At least this is how they behave inside a container when running as PID 1.

Without going deep into the details, I found those articles that are pure gold to explain how signals work inside a container and how to fix it, I cannot add anything more to them:

- https://www.kaggle.com/code/residentmario/best-practices-for-propagating-signals-on-docker
- https://hynek.me/articles/docker-signals/
- https://daveiscoding.com/why-do-you-need-an-init-process-inside-your-docker-container-pid-1
- https://stackoverflow.com/questions/56496495/when-not-to-use-docker-run-init

## Solution

The solution is to use `docker run --init` to run an [init process](https://github.com/krallin/tini) as PID 1, that will take care of propagating the signals to the other processes, it is safe enough to be used basically always.

Today I realized that the pursuit of knowledge is a lifelong journey. It’s important to question what we know to avoid biases.
