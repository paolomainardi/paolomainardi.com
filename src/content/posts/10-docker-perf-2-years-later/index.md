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

Now, almost two years later, how the things are changed? What is the current state of Docker on MacOS?

## Linux Virtualization on MacOS

Let's find out it together, Before diving into some benchmars, let's take a look at the current technologies that allows things like Docker to run on MacOS, let's deep dive into the **Virtualization Framework** and the **VIRTIO** standard.

### Virtualization Framework

One of the key elements of the Docker solutions on MacOS is the **virtualization layer** that allows running Linux Virtual Machines on MacOS. This layer is called [Virtualization Framework](https://developer.apple.com/documentation/virtualization) and it is part of the Apple ecosystem since MacOS Big Sur, which was released in 2020 and it was launched with the first Apple Silicon Macs.

It is based on the [Apple Hypervisor Framework](https://developer.apple.com/documentation/hypervisor) but it offers high-level API to manage virtual machines for MacOS and Linux; it also implements virtual devices, such as network interfaces, block devices, and others implementing the VIRTIO specifications.
Another key feature is the ability to run X86_64 linux binaries on [Apple Silicon through Rosetta 2](https://developer.apple.com/documentation/virtualization/running_intel_binaries_in_linux_vms_with_rosetta), this is quite a powerful feature as Rosetta is an extremely optimized translation layer way faster than QEMU for this specific task and environment; this integration of course means that we can run X86_64 containers when the ARM64 counterpart is not available.

{{< figure src="/images/posts/10-docker/macos-virt-diagram.webp" title="MacOS virtualization architecture" >}}

### VirtIO drivers

The biggest decision Apple did with this framework was to adopt the [VIRTIO](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html) standard, to expose the host hardware to the guest VMs as VirtIO drivers.
This means that on the Linux side we can use the same drivers that we use on other hypervisors like KVM or QEMU, that are very well optimized and maintained by the Linux community and on the MacOS side the system leaverage the VirtIO kernel drivers implemented by Apple.

The architecture looks more or less like this:

{{< figure src="/images/posts/10-docker/macos-virtio.webp" title="Linux - Macos VirtIO architecture" >}}

As we can see from the diagram, the VIRTIO architecture is composed by the following components:

1. **Frontend**: the driver that runs in the guest VM, it is responsible to communicate with the backend driver.
2. **Backend**: the driver that runs in the host, it is responsible to communicate with the frontend driver.
3. **VirtIO** queue: the communication channel between the frontend and the backend driver.

What Apple did was to **implement the backend driver in the Virtualization Framework** and expose the VirtIO queues to the guest VMs, so the Linux kernel can use the VirtIO drivers to communicate with the host hardware.

As far as I know the **Apple VirtIO drivers are not open source**, there are just [some few references on the XNU open-source repository](https://github.com/search?q=repo%3Aapple-oss-distributions%2Fxnu%20virtio&type=code), anyway what is quite sure is that everything is implemented in userspace as confirmed by the currently exposed APIs: https://developer.apple.com/search/?q=virtio&type=Documentation

Of course I've over-simplified the architecture for the sake of simplicity, but if you want to know more I suggest you to read the [VIRTIO specification](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html), the [Virtio on Linux](https://docs.kernel.org/driver-api/virtio/virtio.html) documentation and the super interesting articles series from RedHat _(which invented the standard with IBM)_ [Virtqueues and virtio ring: How the data travels](https://www.redhat.com/en/blog/virtqueues-and-virtio-ring-how-data-travels).

## References

1. [What makes Docker VMM better than Apple Virtualization Framework?](https://github.com/docker/for-mac/issues/7464)
2. [Docker VMM](https://docs.docker.com/desktop/features/vmm/)
3. [REDHAT - vfkit - A macOS hypervisor using Apple's virtualization framework](https://crc.dev/blog/Container%20Plumbing%202023%20-%20vfkit%20-%20A%20minimal%20hypervisor%20using%20Apple%27s%20virtualization%20framework.pdf)
4. [vz - Go binding with Apple Virtualization.framework](https://github.com/Code-Hex/vz)
5. [vfkit - Simple command line tool to start VMs through the macOS Virtualization framework](https://github.com/crc-org/vfkit)
6. [What Are the Latest Docker Desktop Enterprise-Grade Performance Optimizations?](https://www.docker.com/blog/what-are-the-latest-docker-desktop-enterprise-grade-performance-optimizations/#boost-performance-Docker-VMM)
7. [Tart is a virtualization toolset to build, run and manage macOS and Linux virtual machines on Apple Silicon](https://tart.run/)
8. [Podman 5.2 Enhances macOS VMs with GPU Support](https://linuxiac.compodman-5-2-enhances-macos-vms-with-gpu-support/)
9. [Introduction to VirtIO](https://blogs.oracle.com/linux/post/introduction-to-virtio)
