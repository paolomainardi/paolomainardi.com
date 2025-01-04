+++
date = "2024-12-30"
title = "Docker on MacOS is still slow?"
slug = "docker-performance-macos-2025"
tags = ["linux", "docker", "macos"]
draft = "true"
toc = "true"
# featuredImage = "/images/posts/10-docker/og-benchmark-diagram.webp"
images = ["/images/posts/10-docker/og-benchmark-diagram.webp"]
+++

## TLDR

[Two years after my first analysis](https://www.paolomainardi.com/posts/docker-performance-macos/) **of Docker performance on MacOS**, things have **improved significantly**. **VirtioFS** is now much faster _(bind mounts are only 3x slower instead of 5-6x)_, and we have new solutions in the ecosystem.
**[Lima](https://github.com/lima-vm/lima)** (open-source) **performs well and sometimes better than Docker Desktop**, while Docker's new **file synchronization** feature **offers impressive speed improvements** (59% faster) but **requires a paid subscription**. For the most stable performance, the **hybrid approach** (combining bind mounts with volumes) remains the best practice. Choose your setup based on your needs:

- **Fast, stable and Open-source**: Go with Lima.
- **Maximum speed**: Use Docker Desktop with file synchronization.
- **Stable performance**: Use the hybrid approach with volumes with any solution.

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
- **Storage**: 1TB NVMe (Samsung 980 PRO) on BTRFS mounted with the following options `noatime,compress=zstd:1`

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

| Platform           | Test Type           | Average Time (s) | Range (s)     |
| ------------------ | ------------------- | ---------------- | ------------- |
| Lima               | Native              | 3.38             | 3.00-3.63     |
| Lima               | No volumes          | 4.17             | 4.05-4.24     |
| Lima               | Bind mount + volume | 3.96             | 3.87-4.02     |
| **Lima**           | **Bind mount**      | **8.99**         | **8.86-9.10** |
| Docker-VZ          | Native              | 3.37             | 3.00-3.56     |
| Docker-VZ          | No volumes          | 4.44             | 4.00-4.86     |
| Docker-VZ          | Bind mount + volume | 3.61             | 3.55-3.70     |
| **Docker-VZ**      | **Bind mount**      | **9.53**         | **9.44-9.63** |
| Docker-VMM         | Native              | 3.35             | 3.00-3.53     |
| Docker-VMM         | No volumes          | 4.05             | 3.87-4.28     |
| Docker-VMM         | Bind mount + volume | 3.42             | 3.38-3.44     |
| **Docker-VMM**     | **Bind mount**      | **8.47**         | 8.25-8.60     |
| Docker-VZ-sync     | Native              | 4.19             | 3.48-4.67     |
| Docker-VZ-sync     | No volumes          | 4.75             | **4.69-4.84** |
| Docker-VZ-sync     | Bind mount + volume | 4.06             | 3.94-4.30     |
| **Docker-VZ-sync** | **Bind mount**      | **3.88**         | **3.83-3.94** |
|                    |                     |                  |               |
| Linux              | Native              | 5.32             | 5.29-5.36     |
| Linux              | No volumes          | 5.29             | 5.22-5.34     |
| Linux              | Bind mount + volume | 5.22             | 5.20-5.23     |
| **Linux**          | **Bind mount**      | **5.29**         | **5.23-5.33** |

{{< figure src="/images/posts/10-docker/benchmark-graph.svg" >}}

{{< notice tip >}}

Open the [graph in a new tab](/images/posts/10-docker/benchmark-graph.svg) to see it in full resolution and with the data labels.

{{< /notice >}}

Despite being limited to a single test scenario, this benchmark reveals several interesting patterns. Let's analyze the key findings:

1. **Linux Performance Consistency**
   The most striking observation is the consistency of Docker performance on Linux. Regardless of the configuration (bind mounts, volumes, or native operations), execution times remain stable around 5 seconds, with minimal variations. This consistency is expected since no virtualization layer is involved.

{{< notice info >}}
The **overall slower execution times on Linux** (5s) compared to MacOS (3s) are likely **specific to my testing environment**, particularly the **filesystem** (btrfs) and the **older generation NVMe SSD**. I plan to run comparative tests on **another Linux machine with** a **Samsung 990 PRO** and **another file-system like EXT4** to better understand the hardware **impact on performance**.
{{< /notice >}}

1. **Lima vs Docker Desktop Performance**
   Interestingly, **Lima outperforms standard Docker Desktop with Apple Virtualization Framework** in bind mount operations, **clocking at 8.99 seconds compared to 9.53 seconds**. This difference, while modest, demonstrates Lima's efficiency in handling filesystem operations and that **it is already a viable alternative to Docker Desktop**.

1. **Bind Mounts Performance Impact**
   [As previously documented](https://www.paolomainardi.com/posts/docker-performance-macos/#volumes-vs-bind-mounts), **bind mounts remain the slowest option**, running approximately **3x slower than native operations**. However, there's notable progress: previous benchmarks showed bind mounts being 5-6x slower, indicating significant **VirtioFS performance improvements** on MacOS.

1. **File Synchronization Benefits**
   The most dramatic improvement comes from Docker's Apple Virtualization Framework with [file synchronization](https://docs.docker.com/desktop/features/synchronized-file-sharing/) enabled. This configuration reduces bind mount operation times to just 3.88 seconds—a 59% performance improvement over standard Docker-VZ. However, this feature is **only available in Docker for Desktop's paid version**.

{{< notice warning >}}
While testing Docker's file synchronization, I encountered occasional errors during rapid file operations (copying, deleting, moving):

```shell
Testing: Native installation...
rm: node_modules: Permission denied
make: *** [test-native] Error 1
```

These issues likely stem from synchronization delays or file handle management. While this specific benchmark scenario might not reflect typical development workflows, it's worth considering if your work involves intensive file operations.
{{< /notice >}}

1. **Hybrid Approach Stability**
   The combination of bind mounts with volumes shows remarkably consistent performance across all configurations, with times ranging from 3.42 to 4.06 seconds. This stability makes it an attractive option for development environments where predictable performance is crucial.

#### Data

## Conclusions

After **two years** from my first analysis, the **Docker ecosystem** on MacOS has significantly evolved. Here are the main takeaways from our benchmarks:

1. **Performance Has Improved**
   The **VirtioFS** improvements are notable - **bind mount** operations are now only **3x slower** than native operations, compared to **5-6x slower** two years ago. This is a substantial improvement in daily development workflows.

2. **New Solutions Are Emerging**
   The introduction of **Docker VMM** and the maturity of **Lima** show how the ecosystem is evolving. Lima, being an **open-source CNCF project**, proves to be a viable alternative to **Docker Desktop**, sometimes even outperforming it in bind mount operations.

3. **File Synchronization is Game-Changing**
   Docker's **file synchronization** feature shows impressive results, reducing bind mount operation times by **59%**. However, being a **paid feature**, developers need to evaluate if the performance boost justifies the cost for their specific needs.

4. **Best Practices Still Matter**
   The **hybrid approach** (combining bind mounts with volumes) continues to provide the most **consistent performance** across all configurations. This reinforces our previous recommendations about using volumes when possible.

5. **Platform Choice Matters**
   While Docker on **Linux** shows consistent performance regardless of the configuration, **MacOS** users need to carefully consider their setup based on their specific needs:

- For hobby projects or small applications, any solution works fine
- For larger projects, either **Docker with file synchronization** or **Lima** could be the best choice
- For teams, the **hybrid approach** with volumes offers the most predictable performance

Looking forward, we can expect further improvements in the MacOS Docker ecosystem, especially with new projects like **Docker VMM** and the continuous development of **Lima**. The gap between native Linux performance and MacOS virtualized environments continues to narrow, making Docker on MacOS an increasingly viable option for development workflows.

{{< notice tip >}}
If you're setting up a new development environment on MacOS today, I recommend:

- Using **Lima** if you prefer **open-source** solutions, as it offers comparable performance to Docker Desktop, sometimes even outperforming it. It's a great choice, but it doesn't offer any GUI, it is just a CLI tool, which I prefer, but could be a deal-breaker for some.
- Using **Docker Desktop** with **file synchronization** if using closed-source and budget isn't a constraint.
- Implementing the **hybrid approach** with volumes for the most stable performance - see the [previous article](https://www.paolomainardi.com/posts/docker-performance-macos/) with some examples.
  {{< /notice >}}

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
