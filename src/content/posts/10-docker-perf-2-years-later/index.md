+++
date = "2024-12-30"
title = "Docker on MacOS is still slow?"
slug = "docker-performance-macos-2024"
tags = ["linux", "docker", "macos"]
draft = "true"
toc = "true"
# featuredImage = "/images/posts/3-docker/docker-dalle-container-macbook.webp"
# images = ["/images/posts/3-docker/docker-dalle-container-macbook.webp"]
+++

## Introduction

**Two years ago** I wrote this post [Docker on MacOS is slow and how to fix it](https://www.paolomainardi.com/posts/docker-performance-macos/) which had a discrete success, it was featured on the [CNCF blog](https://www.cncf.io/blog/2023/02/02/docker-on-macos-is-slow-and-how-to-fix-it/) and it was trending on [Hacker News](https://news.ycombinator.com/item?id=34098367).

Despite the unexpected success, the goal was to explain all the moving parts of Docker when running in a **virtualized environment** like MacOS or Windows.
What I've found out was that the in **some circumstances the performance were very bad**, especially when using bind mounts, which is quite a common strategy when developing applications with Docker.
At that time I proposed some strategies like using [named volumes](https://www.paolomainardi.com/posts/docker-performance-macos/#volumes) instead of bind mounts, maybe even using [devcontainer](https://www.paolomainardi.com/posts/docker-performance-macos/#gui-editors--ide-users) to improve the developer experience.

Another technique that I've proposed was to enable the `VirtioFS` file sharing driver, which was an still an experimental feature at that time, but it was able to improve the file system performance in a significant way.

Now, **almost two years later**, how the things are changed? What is the current state of Docker on MacOS? Let's find out it together.

## Linux Virtualization on MacOS

Before diving into some benchmarks, let's take a look at the current technologies that allows things like Docker to run on MacOS, let's deep dive into the **Virtualization Framework** and the **VIRTIO** standard, that are the technologies used by almost any virtualization solution on MacOS, including the ones specifically designed for containers like Docker for Desktop, Lima, Rancher Desktop, Podman Desktop, etc...

### Virtualization Framework

One of the key elements of the Docker solutions on MacOS is the **virtualization layer** that allows running Linux Virtual Machines on MacOS. This layer is called [Virtualization Framework](https://developer.apple.com/documentation/virtualization) and it is part of the Apple ecosystem since MacOS Big Sur, which was released in 2020 and it was launched with the first Apple Silicon Macs.

It is based on the [Apple Hypervisor Framework](https://developer.apple.com/documentation/hypervisor) but it offers high-level API to manage virtual machines for MacOS and Linux; it also implements virtual devices, such as network interfaces, block devices, and others implementing the VIRTIO specifications.
Another key feature is the ability to run X86_64 linux binaries on [Apple Silicon through Rosetta 2](https://developer.apple.com/documentation/virtualization/running_intel_binaries_in_linux_vms_with_rosetta), this is quite a powerful feature as Rosetta is an extremely optimized translation layer way faster than QEMU for this specific task and environment; thanks to this integration that we can run `linux/amd64` containers when the `linux/arm64/v8` counterpart is not available.

{{< figure src="/images/posts/10-docker/macos-virt-diagram.webp" title="MacOS virtualization architecture" >}}

#### VirtIO drivers

The biggest decision Apple did with this framework was to adopt the [VIRTIO](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html) standard, to expose the host hardware to the guest VMs as VirtIO drivers.
This means that on the Linux side we can use the same drivers that we use on other hypervisors like KVM or QEMU, that are very well optimized and maintained by the Linux community and on the MacOS side the system leaverage the VirtIO kernel drivers implemented by Apple.

The architecture looks more or less like this:

{{< figure src="/images/posts/10-docker/macos-virtio.webp" title="Linux - Macos VirtIO architecture" >}}

As we can see from the diagram, the VIRTIO architecture is composed by the following components:

1. **Frontend**: the driver that runs in the guest VM, it is responsible to communicate with the backend driver.
2. **Backend**: the driver that runs in the host, it is responsible to communicate with the frontend driver.
3. **VirtIO** queue: the communication channel between the frontend and the backend driver.

A real-world open source example of this architecture can be found in QEMU, I take virtio-net as an example:

1. **Frontend**: https://github.com/qemu/qemu/blob/master/hw/net/virtio-net.c
2. **Backend**: https://github.com/qemu/qemu/blob/master/hw/net/virtio-net.c

What Apple did was to **implement the backend driver in the Virtualization Framework** and expose the VirtIO queues to the guest VMs, so the Linux kernel can use the VirtIO drivers to communicate with the host hardware.

As far as I know the **Apple VirtIO drivers are not open source**, there are just [some few references on the XNU open-source repository](https://github.com/search?q=repo%3Aapple-oss-distributions%2Fxnu%20virtio&type=code), anyway what is quite sure is that everything is implemented in userspace as confirmed by the currently exposed APIs: https://developer.apple.com/search/?q=virtio&type=Documentation

Of course I've over-simplified the architecture for the sake of simplicity, but if you want to know more I suggest you to read the [VIRTIO specification](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html), the [Virtio on Linux](https://docs.kernel.org/driver-api/virtio/virtio.html) documentation and the super interesting articles series from RedHat _(which invented the standard with IBM)_ [Virtqueues and virtio ring: How the data travels](https://www.redhat.com/en/blog/virtqueues-and-virtio-ring-how-data-travels).

### libkrun and Docker VMM

Although the **Virtualization.framework** is a very nice library that covers many use cases, it suffers to be a closed-source project, that cannot be extended in any way, it means that **only Apple can implement new features**, such as new devices, new optimizations, etc...

**Think to run an AI workload** inside a container that needs to **leaverage the GPU**, thanks to the **virtio-gpu** driver we can expose the host GPU to the guest VM, but this is not possible with the current **Apple Virtualization.framework**, as it [implements just 2D acceleration](https://developer.apple.com/videos/play/wwdc2022/10002?time=1077), as announced at WWDC 2022 and no further announcements were made on that, and being a closed-source project no one other than Apple can implement it.

This is where a new project called [libkrun](https://github.com/containers/libkrun) comes into play. This library offers a modern, **Rust-based Virtual Machine Monitor** that directly integrates with the **Hypervisor framework** for creating Virtual Machines on macOS. It is fully open source (Apache 2.0), allowing for extensive customization.

I cannot explain the project and how it works better than **Segio Lopez** did on his blog post: ["Enabling containers to access the GPU on macOS"](https://sinrega.org/2024-03-06-enabling-containers-gpu-macos/), so I suggest to invest some minutes to read this super intersting article.

Another project that is worth mentioning is [Docker VMM](https://docs.docker.com/desktop/features/vmm/), which like **libkrun** is a framwork that integrated the the low-level **HyperVisor.framework** to create and manage VMs on MacOS, instead of the native **Virtualization.framework**. The project is **still in beta** and it is a **closed-source project**. I don't have many other information about it, but from what the documentation says, the goal is to provide significant optimizations both on the Linux Kernel side and on the hypervisor side.

From the [official documentation](https://docs.docker.com/desktop/features/vmm):

> **Docker VMM** brings exciting advancements specifically tailored for Apple Silicon machines. By optimizing both the Linux kernel and hypervisor layers, **Docker VMM delivers significant performance enhancements across common developer tasks**.

> Some key performance enhancements provided by Docker VMM include:

> - **Faster I/O operations**: With a cold cache, iterating over a large shared filesystem with find is 2x faster than when the Apple Virtualization Framework is used.
>
> - **Improved caching**: With a warm cache, performance can improve by as much as 25x, even surpassing native Mac operations.\*

Even if the project is **still in beta and it is a closed-source project**, **I guess it's worth a benchmark** to see how it performs **compared to the Apple Virtualization Framework**.

## Benchmarks

In the previous article I've used this repository [docker-for-mac-bench](https://github.com/paolomainardi/docker-for-mac-bench) to test the filesystem performance on various scenarios, it is a very simple project which use a sample React application and basically runs on it a `npm install`, it is quite simple but effective, we are going to reuse it now, so we can compare the results with the previous ones.

### Tests

The tests that will be run are:

1. Native: Host machine without Docker.
2. Docker without volumes: A container without volumes.
3. Docker volume + mount: bind mount: `./create/react/app:/usr/src/app` and a volume on: `nodemodules:/usr/src/app/node_modules`.
4. Docker bind mount: bind mount: `./create-react-app:/usr/src/app`

This another **good excuse** to make another excalidraw diagram:

{{< figure src="/images/posts/10-docker/docker-benchmark-diagram.webp" title="Mounting options" >}}

So, it's everything [explained in detail here](https://www.paolomainardi.com/posts/docker-performance-macos/), but the core idea to keep in mind to understand the benchmarks is that bind mounting is always the slowest and costly option, as it **requires HOST to VM file-system sharing**, like **VirtioFS**.

### System information

To run the tests, I'll use the following machines:

#### MacOS

- **OS**: MacOS 15.1.1
- **Processor**: Apple M4 Pro 12 cores (8 performance and 4 efficiency)
- **Memory**: 48GB
- **Storage**: 512GB

#### Linux

- **OS**: Archlinux (provisioned with this [ansible playbook](https://github.com/sparkfabrik/archlinux-ansible-provisioner/))
- **Processor**: ThreadRipper PRO 5945WX
- **Memory**: 64GB
- **Storage**: 1TB NVMe (Samsung 980 PRO) on BTRFS mounted with the following options `noatime,compress=zstd`

### Container runtime platforms

I'll use the following container **runtime platforms**:

#### MacOS

- [Docker for Desktop](https://docs.docker.com/desktop/setup/install/mac-install/): 4.37.1
  - **Apple Virtualization Framework** + **VirtioFS**
  - **Docker VMM** + **VirtioFS**
  - **Apple Virtualization Framework** + **VirtioFS** + **Syncronized file sharing**
- [Lima](https://www.cncf.io/projects/lima/): 1.0.3
  - **Apple Virtualization Framework** + **VirtioFS**

[Syncronized file sharing](https://www.docker.com/blog/announcing-synchronized-file-shares/) is a **paid feature** of Docker for Desktop
that uses [Mutagen](https://github.com/mutagen-io/mutagen), [acquired by Docker in 2023](https://www.docker.com/blog/mutagen-acquisition/),
to provide a 2-way file synchronization between the host and the guest VM, it should overcome the performance issues of bind mounts.

{{< notice note >}}
Theoretically, **the same technology** can be used in **other platforms**, like **Lima** using [ddev](https://ddev.readthedocs.io/en/stable/users/install/performance/#mutagen),
but **it will be not tested in this benchmark** as I want to stick just on what the platforms **offer out of the box**. You can see some benchmarks on the [ddev blog](https://ddev.com/blog/docker-performance-2023//).
{{< /notice >}}

#### Linux

- **Docker**: 27.3.1

{{< notice info >}}

They are both configured with `8vCPU` and `16GB` of memory, Docker for Desktop is installed with brew and manually configured, as the current CLI does not provide a way to configure the settings, instead `Lima` is installed and configured as follows:

```shell
limactl create --name=default --vm-type=vz --mount-type=virtiofs --mount-writable --memory=16 --cpus=8 --disk=100 template://docker-desktop`
docker context create lima-default --docker "host=unix:///Users/paolomainardi/.lima/default/sock/docker.sock"
docker context use lima-default
```

The nicest thing here is that we can have both Docker for Desktop and Lima running on the same machine, and just change the docker context we want:

```shell

❯ docker context ls
NAME             DESCRIPTION                               DOCKER ENDPOINT                                              ERROR
default          Current DOCKER_HOST based configuration   unix:///var/run/docker.sock
desktop-linux    Docker Desktop                            unix:///Users/paolomainardi/.docker/run/docker.sock
lima-default *
```

{{< /notice >}}

I am especially interested in the performance of [Lima](https://github.com/lima-vm/lima) as it an [CNCF Open Source project](https://www.cncf.io/projects/lima/).
In [Sparkfabrik](https://www.sparkfabrik.com/) we are still defaulting to **Docker for Desktop**, but we are evaluating the possibility to switch other solutions like **Colima**.

### Results

| Platform       | Test Type           | Average Time (s) | Range (s)     |
| -------------- | ------------------- | ---------------- | ------------- |
| Lima           | Native              | 3.38             | 3.00-3.63     |
| Lima           | No volumes          | 4.17             | 4.05-4.24     |
| Lima           | Bind mount + volume | 3.96             | 3.87-4.02     |
| Lima           | Bind mount          | **8.99** 🏅      | 8.86-9.10     |
| Docker-VZ      | Native              | 3.37             | 3.00-3.56     |
| Docker-VZ      | No volumes          | 4.44             | 4.00-4.86     |
| Docker-VZ      | Bind mount + volume | 3.61             | 3.55-3.70     |
| Docker-VZ      | Bind mount          | **9.53** 🐢      | **9.44-9.63** |
| Docker-VMM     | Native              | 3.35             | 3.00-3.53     |
| Docker-VMM     | No volumes          | 4.05             | 3.87-4.28     |
| Docker-VMM     | Bind mount + volume | 3.42             | 3.38-3.44     |
| Docker-VMM     | Bind mount          | 8.47             | 8.25-8.60     |
| Docker-VZ-sync | Native              | 4.19             | 3.48-4.67     |
| Docker-VZ-sync | No volumes          | **4.75** 🐢      | **4.69-4.84** |
| Docker-VZ-sync | Bind mount + volume | 4.06             | 3.94-4.30     |
| Docker-VZ-sync | Bind mount          | **3.88** 🏅      | 3.83-3.94     |

As we already know bind mounts are **always the slowest options**, it is more less **3x times slower than native** operations, but since the last article the performance of VirtioFS has been improved a lot, last time we saw between 5x and 6x times slower.

The

One of the most notable findings is the considerable impact of bind mounts in traditional setups. Docker-VZ exhibits the highest latency at 9.53 seconds, followed closely by Lima at 8.99 seconds and Docker-VMM at 8.47 seconds. However, Docker-VZ with file synchronization shows a significant improvement, reducing bind mount operation times to just 3.88 seconds—a remarkable 59% boost in performance compared to standard Docker-VZ.

All configurations perform reasonably well for basic operations without volumes, with times ranging from 4.05 to 4.75 seconds. Native operations demonstrate consistent performance across all setups, generally between 3.35 and 3.38 seconds, although Docker-VZ-sync is a slight outlier at 4.19 seconds.

The combination of bind mounts with volumes demonstrates the most stable performance across all configurations, maintaining times between 3.42 and 4.06 seconds. This suggests that it may be a reliable option for development environments where consistent performance is essential.

Errors with file syncronization:

```shell
Testing: Native installation...

rm: node_modules: Permission denied
make: *** [test-native] Error 1
```

{{< figure src="/images/posts/10-docker/benchmark-graph.svg" title="Docker Performance Benchmark Graph" >}}

## References

1. [What makes Docker VMM better than Apple Virtualization Framework?](https://github.com/docker/for-mac/issues/7464)
2. [Docker VMM](https://docs.docker.com/desktop/features/vmm/)
3. [REDHAT - vfkit - A macOS hypervisor using Apple's virtualization framework](https://crc.dev/blog/Container%20Plumbing%202023%20-%20vfkit%20-%20A%20minimal%20hypervisor%20using%20Apple%27s%20virtualization%20framework.pdf)
4. [vz - Go binding with Apple Virtualization.framework](https://github.com/Code-Hex/vz)
5. [vfkit - Simple command line tool to start VMs through the macOS Virtualization framework](https://github.com/crc-org/vfkit)
6. [What Are the Latest Docker Desktop Enterprise-Grade Performance Optimizations?](https://www.docker.com/blog/what-are-the-latest-docker-desktop-enterprise-grade-performance-optimizations/#boost-performance-Docker-VMM)
7. [Tart is a virtualization toolset to build, run and manage macOS and Linux virtual machines on Apple Silicon](https://tart.run/)
8. [Podman 5.2 Enhances macOS VMs with GPU Support](https://linuxiac.com/podman-5-2-enhances-macos-vms-with-gpu-support/)
9. [Introduction to VirtIO](https://blogs.oracle.com/linux/post/introduction-to-virtio)
10. [Virgl not functionning under Apple's virtualization.framework](https://github.com/utmapp/UTM/discussions/5482)
11. [macOS Docker Provider Performance, November 2023](https://ddev.com/blog/docker-performance-2023/)

```

```
