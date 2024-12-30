+++
date = "2022-12-04"
title = "Docker on MacOS is slow and how to fix it"
slug = "docker-performance-macos"
tags = ["linux", "docker", "macos"]
draft = "false"
featuredImage = "/images/posts/3-docker/docker-dalle-container-macbook.webp"
images = ["/images/posts/3-docker/docker-dalle-container-macbook.webp"]
+++

Thanks to the [**DALL·E 2**](https://openai.com/dall-e-2/), we finally have a very nice graphic representation of
**the feelings** of a Docker container inside a macOS environment, I will try with this article to make this poor container safe to the coast.

## TL;DR

At the time of writing, the only viable option to have a _decent performance_
and a _good DX_ are:

1. **VirtioFS** to share the filesystem ([Docker Desktop](https://www.docker.com/blog/speed-boost-achievement-unlocked-on-docker-desktop-4-6-for-mac/), [Rancher Desktop](https://github.com/rancher-sandbox/rancher-desktop/issues/3488), [Colima](https://github.com/drud/ddev/issues/3750)) - [There are still some issues](https://github.com/docker/roadmap/issues/7#issuecomment-1360243730).
1. Use **named volumes** and if you use VSCode you can rely on things like [DevContainers](https://code.visualstudio.com/docs/devcontainers/containers) to have a good DX - 🚀 **BONUS**: [PoC project](https://github.com/paolomainardi/docker-backstage-devcontainers) with Backstage and DevContainers.
1. Use [DDEV](https://ddev.com) + [Mutagen](https://ddev.readthedocs.io/en/latest/users/install/performance/) for PHP projects (JS coming soon).
1. If you are **VI/Emacs** user, all you need is your editor and tools in a container, or if you want a minimal Linux GUI env, [take some inspiration here](https://github.com/mitchellh/nixos-config).

### Update 15/02/2023

At the time of writing is still a beta option but it looks promising, from Docker Desktop 4.16.0 (https://docs.docker.com/desktop/release-notes/#4160)
it is possible to use Rosetta2 instead of QEMU to run x86 containers. You can enable it very easily from the experimental feature settings tab, it will increase dramaticaly the emulation performance.

## How does Docker work on macOS?

{{< figure src="https://collabnix.com/wp-content/uploads/2018/05/Screen-Shot-2018-05-07-at-8.13.29-AM.png" caption="Docker architecture on macOS - Source <https://collabnix.com/how-docker-for-mac-works-under-the-hood>" >}}

**Docker engine**, on macOS and Windows, needs a **Linux Kernel**; there aren't any exceptions here, you do not see it, but it is there to do all the dirty jobs _(HN:_ [_https://news.ycombinator.com/item?id=11352594_][1]_)_

Instead, **Docker CLI** and **docker-compose** are **native binaries** for **all** **operating systems**.

**Two things** are worth mentioning here regarding Microsoft; **the first one** is that Windows (and this sometimes can lead to some confusion) **natively support** [Docker to run Windows containers][2].

This implementation has been possible thanks to the joint effort of **Microsoft and Docker** [**in 2016**][3] to create a container engine implementing the Docker specification on Windows; kudos to you, MS.

The **second one** is that Microsoft tried in the past to **natively support Linux processes** by real-time converting syscalls to run unmodified Linux processes on the Windows kernel (WSL1).

[You can find here][4] a very detailed deep dive into this brilliant technology; even though Microsoft still supports it, [it has significant limitations][5] in terms of performance and compatibility. This is why Microsoft released a new engine, **WSL2,** which is based on a more traditional approach of a lightweight virtual machine running an unmodified Linux kernel plus some kernel modules to better integrate on Windows.

Anyway, let's go back to the topic.

[Docker for Mac][6] is the official Docker inc. product made to run most seamlessly Docker containers on macOS; they even support Kubernetes.

Some **notable features** of Docker for Mac:

- Docker for Mac **runs** in a [LinuxKit VM][7] and [recently switched][8] to the [Virtualization Framework][9] instead of [HyperKit][10].
- **Filesystem sharing** is implemented on a _proprietary technology_ called [OSXFS][11]. [Since it is slow][12] for most of the use cases where tons and tons of files are involved _(yes, I am looking at you, Node, and PHP)_, a new player is slowly ramping up from the labs; I am talking about [VirtioFS][13] - [which seems very promising][14].
- **Networking** is based on [VPNKit][15].
- It can run [**Kubernetes**][16].
- It is a **closed-source** product, and if conditions matches require a [paid subscription][17] (at the time of writing: _"Companies with more than 250 employees OR more than $10 million in annual revenue"_)

There are two valid OSS alternatives:

- [Rancher desktop][18]
- [Colima][19]

They both use [Lima][20], filesystem-sharing [issues are tracked here][21], and VirtioFS has [just landed][22]. It is interesting to see that the consensus around [VirtioFS][23] is confirmed, and once again, open source sets the rules.

So, **to sum up**:

1. Docker containers are still **Linux processes** and need a **Virtual Machine** to run on other operating systems.
2. Docker-cli and docker-compose are **native binaries.**
3. As Docker runs in a virtual machine, **something to share the host filesystem with the VM is required**; we can choose between **_OSXFS_** _(proprietary and deprecated),_ [**_gRCP FUSE_**][24]_, or_ **_VirtioFS_**. They all come with issues, and [**VirtioFS is the most promising one**][25].
4. To run **Docker containers on Mac**, you can choose between [**Docker for Mac**][26] (closed-source), [**Rancher Desktop**][27] (OSS), and [**Colima**][28] (OSS).

## What is a Docker volume?

Now that we know how the underlying things work, we can quickly dive into another confusion-leading topic: [**Docker Volumes**][29].

Docker containers are _ephemeral_, and this means that files exist inside the containers as long as the container exists, let's see a an example:

```shell {linenos=inline}
➜  ~ # Run a container and keep it running for 300 seconds.

➜  ~ docker run -d --name ephemeral busybox sh -c "sleep 300"
d0b02322a9eef184ab00d6eee34cbd22466e7f7c1de209390eaaacaa32a48537

➜  ~ # Inspect a container to find the host PID.
➜  ~ docker inspect --format '{{ .State.Pid }}' d0b02322a9eef184ab00d6eee3
4cbd22466e7f7c1de209390eaaacaa32a48537
515584

➜  ~ # Find the host path of the container filesystem (in this case is a btrfs volume)
➜  ~ sudo cat /proc/515584/mountinfo | grep subvolumes
906 611 0:23 /@/var/lib/docker/btrfs/subvolumes/b237a173b0ba81eb0a60d35b59b0cc5ed[truncated]

➜  ~ # Read the container filesystem from the host.
➜  ~ sudo ls -ltr /var/lib/docker/btrfs/subvolumes/b237a173b0ba81eb0a60d35
b59b0cc5ed7247423bed4b4dcbb5af57a1c3318eb
total 4
lrwxrwxrwx 1 root   root      3 Nov 17 21:00 lib64 -> lib
drwxr-xr-x 1 root   root    270 Nov 17 21:00 lib
drwxr-xr-x 1 root   root   4726 Nov 17 21:00 bin
drwxrwxrwt 1 root   root      0 Dec  5 22:00 tmp
drwx------ 1 root   root      0 Dec  5 22:00 root
drwxr-xr-x 1 root   root     16 Dec  5 22:00 var
drwxr-xr-x 1 root   root      8 Dec  5 22:00 usr
drwxr-xr-x 1 nobody nobody    0 Dec  5 22:00 home
drwxr-xr-x 1 root   root      0 Dec 10 18:37 proc
drwxr-xr-x 1 root   root      0 Dec 10 18:37 sys
drwxr-xr-x 1 root   root    148 Dec 10 18:37 etc
drwxr-xr-x 1 root   root     26 Dec 10 18:37 dev

➜  ~ # Now write something from the container and see if it's reflected on the host filesystem.
➜  ~ docker ps -l
CONTAINER ID   IMAGE     COMMAND               CREATED         STATUS         PORTS     NAMES
d0b02322a9ee   busybox   "sh -c 'sleep 300'"   4 minutes ago   Up 4 minutes             ephemeral
➜  ~ docker exec -it d0b02322a9ee touch hello-from-container
➜  ~ sudo ls -ltr /var/lib/docker/btrfs/subvolumes/b237a173b0ba81eb0a60d35b59b0cc5ed7247
423bed4b4dcbb5af57a1c3318eb | grep hello
-rw-r--r-- 1 root   root      0 Dec 10 18:42 hello-from-container

➜  ~ # Now write something from the host to see reflected on the container.
➜  ~ sudo touch /var/lib/docker/btrfs/subvolumes/b237a173b0ba81eb0a60d35b59b0cc5ed72474
23bed4b4dcbb5af57a1c3318eb/hello-from-the-host
➜  ~ docker exec -it d0b02322a9ee sh -c "ls  | grep hello-from-the-host"
hello-from-the-host

➜  ~ # Stop the container.
➜  ~ docker stop d0b02322a9ee
➜  ~ sudo ls -ltr /var/lib/docker/btrfs/subvolumes/b237a173b0ba81e
b0a60d35b59b0cc5ed7247423bed4b4dcbb5af57a1c3318eb
total 4
lrwxrwxrwx 1 root   root      3 Nov 17 21:00 lib64 -> lib
drwxr-xr-x 1 root   root    270 Nov 17 21:00 lib
drwxr-xr-x 1 root   root   4726 Nov 17 21:00 bin
drwxrwxrwt 1 root   root      0 Dec  5 22:00 tmp
drwx------ 1 root   root      0 Dec  5 22:00 root
drwxr-xr-x 1 root   root     16 Dec  5 22:00 var
drwxr-xr-x 1 root   root      8 Dec  5 22:00 usr
drwxr-xr-x 1 nobody nobody    0 Dec  5 22:00 home
drwxr-xr-x 1 root   root      0 Dec 10 18:44 sys
drwxr-xr-x 1 root   root      0 Dec 10 18:44 proc
drwxr-xr-x 1 root   root    148 Dec 10 18:44 etc
drwxr-xr-x 1 root   root     26 Dec 10 18:44 dev
-rw-r--r-- 1 root   root      0 Dec 10 18:45 hello-from-the-host

➜  ~ # Filesystem still exists until it is just stopped, but now let's remove it.
➜  ~ docker rm ephemeral
ephemeral
➜  ~ sudo ls -ltr /var/lib/docker/btrfs/subvolumes/b237a173b0ba81eb0a
60d35b59b0cc5ed7247423bed4b4dcbb5af57a1c3318eb
ls: cannot access '/var/lib/docker/btrfs/subvolumes/b237a173b0ba81eb0
a60d35b59b0cc5ed7247423bed4b4dcbb5af57a1c3318eb': No such file or directory
```

So, what happened here:

1. While **running** and **stopping state**, the container has an **allocated filesystem** on the host.
2. **Removing** a container **removes** the **associated filesystem** too.

If you want to deep-dive more into this subject, I cannot recommend more those excellent readings:

1. [Deep Dive into Docker Internals - Union Filesystem][30]
2. [Where are my container's files? Inspecting container filesystems][31]

Now that we have a clearer understanding of how Docker manages the filesystem, it is easily understandable **how risky** it can be to use a **container without proper data persistency** layer. This is exactly where docker volumes come in handy.

{{< figure src="https://docs.docker.com/storage/images/types-of-mounts-bind.png" caption="Docker volumes and bind mounts" >}}

### Bind mounts

{{< notice warning >}}

Bind mounting is the core of all problems of bad filesystem performance.

{{< /notice >}}

As the [documentation][32] states: _"Bind mounts have been around since the early days of Docker. Bind mounts have limited functionality compared to_ [_volumes_][33]_. A file or directory on the host machine is mounted into a container when you use a bind mount. The file or directory is referenced by its absolute path on the host machine. By contrast, when you use a volume, a new directory is created within Docker's storage directory on the host machine, and Docker manages that directory's contents."_

This **is all you need** to bind mount a host directory inside a container:

`➜ docker run -v <host-path>:<container-path> <container>`

Let's see a quick real-world example of how bind mounts work:

{{< asciicast src="/asciinema/3-docker-bind-mounts.rec" poster="npt:0:04" autoPlay=false loop=true >}}

And yes, this is precisely **where all the problem begins**.

A bind mount is a way to mount the host filesystem inside a container, and you can imagine if a VM is in the middle of us and the container, everything gets more complicated.

From 10 thousand feet, it works like this:

{{< figure src="/images/posts/3-docker/docker-mac-diagram.excalidraw-black.webp" caption="Docker bind mount diagram" >}}

So, when you **mount a path from your Mac**, you are just **asking the Linux VM** to **mount the path** of the **network-shared filesystem** of your Mac.

Usually, you do not need to configure this tedious part manually; the tools automatically do it for you.

You can find it what is mounted on Docker Desktop under:

Preferences -> Resources -> File sharing

{{< figure src="/images/posts/3-docker/docker-mac-bind-mounts.webp" caption="Docker Desktop bind mount settings" >}}

As you can see from the image, we are mounting local paths like `/Users` as mount path on the Linux VM, and thanks to this, we can mount Mac directories as they were local:

```shell {linenos=inline}
➜  ~ docker run --rm -it -v /Users/paolomainardi:$(pwd) alpine ash
/ # ls -ltr
total 60
drwxr-xr-x   12 root     root          4096 May 23  2022 var
drwxr-xr-x    7 root     root          4096 May 23  2022 usr
drwxrwxrwt    2 root     root          4096 May 23  2022 tmp
drwxr-xr-x    2 root     root          4096 May 23  2022 srv
drwxr-xr-x    2 root     root          4096 May 23  2022 run
drwxr-xr-x    2 root     root          4096 May 23  2022 opt
drwxr-xr-x    2 root     root          4096 May 23  2022 mnt
drwxr-xr-x    5 root     root          4096 May 23  2022 media
drwxr-xr-x    7 root     root          4096 May 23  2022 lib
drwxr-xr-x    2 root     root          4096 May 23  2022 home
drwxr-xr-x    2 root     root          4096 May 23  2022 sbin
drwxr-xr-x    2 root     root          4096 May 23  2022 bin
dr-xr-xr-x   13 root     root             0 Dec 11 14:33 sys
dr-xr-xr-x  260 root     root             0 Dec 11 14:33 proc
drwxr-xr-x    1 root     root          4096 Dec 11 14:33 etc
drwxr-xr-x    5 root     root           360 Dec 11 14:33 dev
drwxr-xr-x    3 root     root          4096 Dec 11 14:33 Users
drwx------    1 root     root          4096 Dec 11 14:33 root
/ # ls -ltr /Users/paolomainardi/
total 4
drwxr-xr-x    4 root     root           128 Dec 18  2021 Public
drwx------    4 root     root           128 Dec 18  2021 Music
drwx------    5 root     root           160 Dec 18  2021 Pictures
drwx------    4 root     root           128 Dec 18  2021 Movies
drwxr-xr-x    4 root     root           128 Dec 18  2021 bin
drwxr-xr-x    4 root     root           128 Dec 31  2021 go
-rw-r--r--    1 root     root            98 Apr  1  2022 README.md
drwxr-xr-x    5 root     root           160 Apr  3  2022 webapps
drwx------    6 root     root           192 Nov 12 16:50 Applications
drwxr-xr-x    3 root     root            96 Nov 28 21:23 Sites
drwxr-xr-x   14 root     root           448 Nov 28 22:22 temp
drwx------  105 root     root          3360 Dec  5 09:16 Library
drwx------  164 root     root          5248 Dec  8 01:16 Downloads
drwx------    5 root     root           160 Dec  8 01:27 Desktop
drwx------   26 root     root           832 Dec  8 01:37 Documents
```

### Volumes

As the [documentation][34] says:

> Volumes are the preferred mechanism for persisting data generated by and used by Docker containers. While [bind mounts][35] depend on the host machine's directory structure and OS, volumes are completely managed by Docker. Volumes have several advantages over bind mounts:

> Volumes have several advantages:
>
> - _Volumes are easier to back up or migrate than bind mounts._
> - _You can manage volumes using Docker CLI commands or the Docker API._
> - _Volumes work on both Linux and Windows containers._
> - _Volumes can be more safely shared among multiple containers._
> - _Volume drivers let you store volumes on remote hosts or cloud providers, to encrypt the contents of volumes, or to add other functionality._
> - _New volumes can have their content pre-populated by a container._
> - Volumes on Docker Desktop have **much higher performance** **than bind mounts** from **Mac** and **Windows hosts**.

Well, there's nothing to add here; the **advantages** of volumes vs. bind mounts are apparent, especially the last point.

But the biggest **drawback** is the **developer experience**; they are not meant to satisfy this requirement from the beginning, and using them for coding is counterintuitive or not usable.

Let me demonstrate in practice how they work; I'll show you in order:

1. A javascript node API up and running on localhost
2. Development lifecycle on the host
3. Create a Docker Volume
4. Create a container using the docker volume
5. Developing workflow inside a container with a volume

{{< asciicast src="/asciinema/3-docker-volumes.rec" poster="npt:0:04" autoPlay=false loop=true >}}

_(I am the king of typos, I've tried to record this asciinema without errors ten times, and this is the best I've finally achieved 🏆🏆🏆)_

As you have noted, the **biggest drawback** here is that **any changes** I am doing outside the container must be copied inside the container with `docker cp`.

I **could have mitigated** this issue by **installing VI inside the container**, but I would **have lost all my dotfiles,** and usually, for Javascript, I prefer to use VSCode.

## Volumes vs. bind-mounts

Well, a long journey so far, and still not yet a solution 😎

At least we have learned two things:

1. Bind mounts are the most natural way to move our files inside a container, but they suffer severe performance issues caused by file system sharing when the Docker engine runs in a VM.
2. Volumes are way faster than bind mounts, but they lack the basics of the development experience (e.g., You and your local editor cannot see the files outside the container)

### Benchmarks

To demonstrate how much the performance is affected based on different scenarios (bind, volumes), I've created a simple [test suite][36], nothing super fancy, just running some `npm install` tests on an empty [create-react-app][37] project.

Let's see them in action:

**Environments**:

1. Pane top: macOS - Docker Desktop - virtioFS enabled
2. Pane bottom: Linux

**Tests (npm install)**:

1. Native node on the host
2. Docker without bind/volumes
3. Docker with a bind mount + a volume just for node_modules
4. Docker with a bind mount

{{< asciicast src="/asciinema/3-docker-bench-linux-mac.rec" poster="npt:0:04" autoPlay=false loop=true >}}

#### Syntethic results

| Test                             | Operating system | Time (s)     |
| -------------------------------- | ---------------- | ------------ |
| Native                           | Linux            | 5,73         |
| Docker                           | Linux            | 5.64         |
| Docker - Bind Mount              | Linux            | 6.81         |
| **Docker - Bind Mount + Volume** | Linux            | 6,18         |
| Native                           | macOS            | 4.09         |
| Docker                           | macOS            | 6.80         |
| Docker - Bind Mount + Volume     | macOS            | 7.65         |
| **Docker - Bind Mount**          | macOS            | **21.05** 🏆 |

And finally, we can see the performance impact results; macOS is more or less x3.5 times slower ([10x times slower when using gRPC Fuse][38]) when using just the bind mount, and the culprit here is the `node\_modules` directory _\[328M and 37k files just for an empty React app\]._

Moving this directory (node_modules) in a Volume makes the timing on par with Linux: 7.65s.

I've just taken Node as an example. Still, other development ecosystems are affected by the same issue _(yes, PHP, I am looking at you and your `vendor`👀)_, or more generic directories with hundreds of thousands of small files are devilish for performance.

## Fixes

Now that we have a general overview of the moving pieces, how they work, and can be combined, the next question is:

**What is the recommended method for decent performance and a good DX with Docker on Mac?**

This is an excellent question!

{{< figure src="/images/posts/3-docker/docker-desktop-virtiofs.webp" caption="Use VirtioFS" >}}

The short answer for now is: **Docker Desktop for Mac with VirtioFS**, is a good compromise between **performance and DX**, even if it is slower than Linux; for most cases, it is a **negligible difference**.

When developing a new project in Node or PHP, you're not going to **reinstall your node_modules/vendor** from scratch every time, it is rare, and in that rare cases, you'll spend a bit more seconds.

Just keep in mind that:

1. It is a closed-source product
2. It requires a license depending on the usage
3. Since it is a pretty recent technology, [many issues and regressions remain.][39]

So, what are the alternatives?

### Bind mounts + Volume

As the results below show, this is the best approach to **have almost native performance**, but it comes with significant **DX issues**.

Let's see an example:

{{< asciicast src="/asciinema/3-docker-volumes-dev-scenario.rec" poster="npt:0:04" autoPlay=false loop=true >}}

We cannot see from our host the files being written by the container, and this is a big issue that can
impact how we write the software and how our IDE will be capable of understanding the codebase we are working on.

How we can fix it ? Well depends on how you are used to develop.

#### Terminal editor's users

The only thing you need here is a container with the editor and the tools you need; mount your **dotfiles** and your **code**, and that's it; you'll enjoy an almost **native experience**.

`> docker run --rm -v $HOME/.vimrc:/home/node/.vimrc -v $PWD:/usr/src/app node:lts bash`

#### GUI Editors / IDE users

Here things **become more complicated**.

**Desktop applications** are bound to the operating system they are designed for, and they usually cannot understand much of the underlying abstractions, like a filesystem inside a Docker container.

As the problem is that we cannot read or write files from and to the docker volume, we need a tool capable of this two-way syncing.

One of the most **prominent solutions** is [Mutagen](https://mutagen.io/documentation/synchronization).

**Mutagen** allows **syncing the files in both directions** from/to the host/container when they happen.
You can find here [how to install it](https://mutagen.io/documentation/synchronization) and how to configure it.

Not very easy to grasp at the beginning since it is composed of a **daemon**, a **CLI tool**, and some **configuration files**.
It natively supports Composer and has also been a part of the Docker Desktop experimental feature, [then deprecated](https://github.com/mutagen-io/mutagen/issues/235) and then again by the Mutagen authors as a [Docker Desktop extension](https://mutagen.io/documentation/docker-desktop-extension#license-and-pricing).

The last worth mentions, it is also supported and integrated by the [DDEV project](https://ddev.readthedocs.io/en/latest/users/install/performance/).

**DDEV** is a tool to manage local development environments for **PHP projects** (it started with Drupal ❤️) and then extended to many more frameworks.
This is the best **plug-and-play** and **battery-included** choice to manage your PHP project with Docker, no matter the operating system you run.

**Well, what if we want to avoid installing other moving parts? Can we run our GUI Editor as a Docker container so we can access the files?**

[You can run them quite easily][40] on Linux, but there isn't a comparable straightforward solution to run Linux GUI applications on macOS; unless you install [XQuartz][41] (Xorg for macOS) and [do some tricks][42].

Microsoft here did a very cool thing instead; they implemented a Wayland compositor for Windows capable of natively running Linux GUI applications: [WSLg][43]

Anyway, this is not a very practical way to use an editor, which will always be very limited and poorly integrated with the operating system.

The best solution would be to have an IDE capable of running on your local system while simultaneously being capable of using Docker Containers, having the best of both worlds.

Should we invent it? Luckily for us, no, we shouldn't because someone already did it, and I am talking about [Development Containers][44]

#### Development Containers

> An [open specification][45] for enriching containers with development specific content and settings.

A Development Container (or Dev Container for short) allows you to use a container as a full-featured development environment. It can be used to run an application, to separate tools, libraries, or runtimes needed for working with a codebase, and to aid in continuous integration and testing. Dev containers can be run locally or remotely, in a private or public cloud.

Not more to add here; the intent and the specs are very straightforward and clear about the goals.

Microsoft [created this project][46], and the spec is released under the [CC4][47] license.

[Here][48] you can find a list of _"supporting tools"_ for the moment is almost "all Microsoft" for the editors part and cloud services; we have, of course, Visual Studio Code and GitHub Codespaces.

However, the project is slowly getting attraction, even tho there are several competitors and compelling standards in this area.

Cloud companies and developer-focused startups envision a world made of cloud-based development environments, which have pros and cons. I'll debate this topic in another post.

The most significant competitors now are:

- Gitpod
- GCP Cloud Workstations
- AWS Cloud9
- Docker Development Environment

#### How it works

You need to create a `.devcontainer/devcontainer.json` file inside the project's root, and a supporting editor (AKA VsCode) will just run it.

{{< figure src="https://code.visualstudio.com/assets/docs/devcontainers/containers/architecture-containers.png" caption="Developing inside a container" >}}

You can find here [a very good quick start][49]. It covers almost all aspects, including using it with Docker Compose.

There is also a [very nice guide on how to][50] use it to improve the performance of macOS using Volumes instead of just bind mounts, which we have already discussed.

To make it easily understandable (at least for me), I've created a PoC project to connect all the wires;
the project lives here: [https://github.com/paolomainardi/docker-backstage-devcontainers][51] and it's an empty
[Backstage](https://backstage.io/) application to test the entire development workflow using the VSCode Dev Containers integration.

To conclude, the overall idea is excellent, and since it is an open standard, it could be easily adopted by other vendors, and there are yet some efforts ongoing:

1. [Gitpod](https://github.com/gitpod-io/gitpod/issues/7721)
1. [Jetbrains](https://youtrack.jetbrains.com/issue/IDEA-202267)
1. [nVIM](https://codeberg.org/esensar/nvim)

To summarize the key points, i like much:

1. Everything is Container-based.
2. I can define custom VSCode extensions: I can define a shared development environment between team members.
3. Thanks to the [Development containers features.][52], I can use Docker and Docker-compose inside the container.
4. SSH works out of the box (you must have the ssh-agent up and running)/
5. I can reuse the very same configuration locally or in the cloud.

## Conclusions

This post started with the intent to quickly explain how to improve the performance of Docker on macOS, but at the same time, I felt the need to leave nothing behind of the basic concepts that are fundamentals to understand and get out the max from your system.

The big question here is, **why not just use Linux?**

This **isn't** a **trivial question**; I use Linux as my [daily driver][53] (I'm writing this post on Linux), and I consider it the best development environment you can use.

But the **hardware ecosystem** must be taken into account, especially since the **Apple Silicon** machines are in the market; they are so great in terms of **performance, battery life, and service**.

So why don't you get the **best of both worlds**? Machines are powerful enough today to run them seamlessly.
There are other creative ways to combine them, as **Michal Hashimoto** did, [merging macOS and NixOS][54], lovely.

Use what you like and what you find better for your workflow and, why not, **what makes you happy** today.

This is also a gift for the future me; next time, I should explain to someone how Docker works on Linux and outside, and I'll use this guide as a general reference.

Thanks for reading all of this, and if you find something wrong or want to discuss some topics further, get in touch with me.

[1]: https://news.ycombinator.com/item?id=11352594
[2]: https://learn.microsoft.com/en-us/virtualization/windowscontainers/about/
[3]: https://www.docker.com/blog/dockerforws2016/
[4]: https://subscription.packtpub.com/book/cloud-and-networking/9781800562448/2/ch02lvl1sec04/exploring-the-differences-between-wsl-1-and-2
[5]: https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux#:~:text=WSL%201%20is%20not%20capable,device%20drivers%2C%20cannot%20be%20run.
[6]: https://docs.docker.com/desktop/install/mac-install/
[7]: https://github.com/linuxkit/linuxkit/blob/master/examples/docker-for-mac.md
[8]: https://github.com/docker/for-mac/issues/6578
[9]: https://developer.apple.com/documentation/virtualization
[10]: https://github.com/docker/HyperKit/
[11]: https://docker-docs.netlify.app/docker-for-mac/osxfs/
[12]: https://www.google.com/search?q=osxfs+slow&ie=utf-8&oe=utf-8&aq=t
[13]: https://virtio-fs.gitlab.io/
[14]: https://www.docker.com/blog/speed-boost-achievement-unlocked-on-docker-desktop-4-6-for-mac/
[15]: https://github.com/moby/vpnkit
[16]: https://docs.docker.com/desktop/kubernetes/
[17]: https://www.docker.com/legal/docker-subscription-service-agreement/
[18]: https://rancherdesktop.io/
[19]: https://github.com/abiosoft/colima/
[20]: https://github.com/lima-vm/lima
[21]: https://github.com/lima-vm/lima/issues/20
[22]: https://github.com/lima-vm/lima/issues/20#issuecomment-1323111870
[23]: https://gitlab.com/virtio-fs
[24]: https://www.docker.com/blog/speed-boost-achievement-unlocked-on-docker-desktop-4-6-for-mac/
[25]: https://www.jeffgeerling.com/blog/2022/new-docker-mac-virtiofs-file-sync-4x-faster
[26]: https://docs.docker.com/desktop/install/mac-install/
[27]: https://rancherdesktop.io/
[28]: https://github.com/abiosoft/colima
[29]: https://docs.docker.com/storage/volumes/
[30]: https://martinheinz.dev/blog/44
[31]: https://blog.px.dev/container-filesystems/
[32]: https://docs.docker.com/storage/bind-mounts/
[33]: https://docs.docker.com/storage/volumes/
[34]: https://docs.docker.com/storage/volumes/
[35]: https://docs.docker.com/storage/bind-mounts/
[36]: https://github.com/paolomainardi/docker-for-mac-bench
[37]: https://create-react-app.dev/
[38]: https://github.com/sparkfabrik/sparkdock/issues/61
[39]: https://github.com/docker/roadmap/issues/7#issuecomment-1356808914
[40]: https://github.com/89luca89/distrobox
[41]: https://www.xquartz.org/
[42]: https://gist.github.com/sorny/969fe55d85c9b0035b0109a31cbcb088
[43]: https://github.com/microsoft/wslg
[44]: https://containers.dev/
[45]: https://containers.dev/implementors/spec/
[46]: https://github.com/devcontainers/spec
[47]: https://creativecommons.org/licenses/by/4.0/legalcode
[48]: https://github.com/devcontainers/spec/blob/main/docs/specs/supporting-tools.md
[49]: https://code.visualstudio.com/docs/devcontainers/tutorial
[50]: https://code.visualstudio.com/remote/advancedcontainers/improve-performance
[51]: https://github.com/paolomainardi/docker-backstage-devcontainers
[52]: https://github.com/devcontainers/features
[53]: https://github.com/paolomainardi/archlinux-ansible-provisioner
[54]: https://github.com/mitchellh/nixos-config
