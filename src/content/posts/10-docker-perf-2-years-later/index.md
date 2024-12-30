+++
date = "2024-12-30"
title = "Is Docker on MacOS still slow in 2024?"
slug = "docker-performance-macos-2024"
tags = ["linux", "docker", "macos"]
draft = "true"
# featuredImage = "/images/posts/3-docker/docker-dalle-container-macbook.webp"
# images = ["/images/posts/3-docker/docker-dalle-container-macbook.webp"]
+++

**Two years ago** I wrote this post [Docker on MacOS is slow and how to fix it](https://www.paolomainardi.com/posts/docker-performance-macos/) which had a discrete success, it was featured on the [CNCF blog](https://www.cncf.io/blog/2023/02/02/docker-on-macos-is-slow-and-how-to-fix-it/) and it was trending on [Hacker News](https://news.ycombinator.com/item?id=34098367).

Despite the unexpected success, the goal was to explain all the moving parts of Docker when running in a **virtualized environment** like MacOS or Windows.
What I've found out was that the in **some circumstances the performance were very bad**, especially when using bind mounts, which is quite a common strategy when developing applications with Docker.
At that time I proposed some strategies like using [named volumes](https://www.paolomainardi.com/posts/docker-performance-macos/#volumes) instead of bind mounts, maybe even using [devcontainer](https://www.paolomainardi.com/posts/docker-performance-macos/#gui-editors--ide-users) to improve the developer experience.

Another technique that I've proposed was to enable the `VirtioFS` file sharing driver, which was an still an experimental feature at that time, but it was able to improve the file system performance in a significant way.

Now, almost two years later, how the things are changed? What is the current state of Docker on MacOS?

Let's find out it together.

## The current state of Docker on MacOS

### Virtualization Framework and VIRTIO

One of the key elements of the Docker solutions on MacOS is the **virtualization layer** that allows running Linux Virtual Machines on MacOS. This layer is called [Virtualization Framework](https://developer.apple.com/documentation/virtualization) and it is part of the Apple ecosystem since MacOS Big Sur, which was released in 2020 and it was launched with the first Apple Silicon Macs.

The biggest decision Apple did with this framework was to adopt [VIRTIO](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html) standard for the virtual devices, which is a standard that is widely adopted in the Linux world and it is used by the most popular hypervisors like KVM, QEMU, and others.

![MacOS virtualization](/images/posts/10-docker/macos-virt-diagram.png)

### Apple Virtualization Framework

Since the release of MacOS Big Sur, Apple introduced the [Apple Virtualization Framework](https://developer.apple.com/documentation/virtualization) that allows running virtual machines on Apple Silicon Macs. This new framework is a replacement for the old **Hypervisor.framework**

### VirtioFS driver

### References

1. [What makes Docker VMM better than Apple Virtualization Framework? ](https://github.com/docker/for-mac/issues/7464
2. [Docker VMM](https://docs.docker.com/desktop/features/vmm/)
3. [REDHAT - vfkit - A macOS hypervisor using Apple's virtualization framework](https://crc.dev/blog/Container%20Plumbing%202023%20-%20vfkit%20-%20A%20minimal%20hypervisor%20using%20Apple%27s%20virtualization%20framework.pdf)
4. [vz - Go binding with Apple Virtualization.framework](https://github.com/Code-Hex/vz)
5. [vfkit - Simple command line tool to start VMs through the macOS Virtualization framework](https://github.com/crc-org/vfkit)
6. [What Are the Latest Docker Desktop Enterprise-Grade Performance Optimizations?](https://www.docker.com/blog/what-are-the-latest-docker-desktop-enterprise-grade-performance-optimizations/#boost-performance-Docker-VMM)
7. [Tart is a virtualization toolset to build, run and manage macOS and Linux virtual machines on Apple Silicon](https://tart.run/)
8. [Podman 5.2 Enhances macOS VMs with GPU Support](https://linuxiac.compodman-5-2-enhances-macos-vms-with-gpu-support/)
