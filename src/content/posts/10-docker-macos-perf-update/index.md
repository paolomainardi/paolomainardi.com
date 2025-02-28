+++
date = "2025-01-04"
title = "Docker on MacOS is still slow?"
slug = "docker-performance-macos-2025"
tags = ["linux", "docker", "macos"]
draft = "false"
toc = "true"
#  featuredImage = "/images/posts/10-docker/og-benchmark-diagram.webp"
images = ["/images/posts/10-docker/og-benchmark-diagram.webp"]
+++

{{< notice info >}}
**06/01/2025** Update: Many readers requested the inclusion of [OrbStack](https://orbstack.dev) in the benchmarks. This update introduces OrbStack's performance data, along with updated insights and comparisons.
{{< /notice >}}

## TLDR

[Two years after my first analysis](https://www.paolomainardi.com/posts/docker-performance-macos/) **of Docker performance on MacOS**, things have **improved significantly**. **VirtioFS** is now much faster _(bind mounts are only 3x slower instead of 5-6x)_, and we have new solutions in the ecosystem. **[Lima](https://github.com/lima-vm/lima)** (open-source) **performs well and sometimes better than Docker Desktop**, while Docker's new **file synchronization** feature **offers impressive speed improvements** (59% faster) but **requires a paid subscription**. Additionally, **[OrbStack](https://orbstack.dev/)** has emerged as a strong contender, offering excellent performance with bind mounts and native operations. For the most stable performance, the **hybrid approach** (combining bind mounts with volumes) remains the best practice. Choose your setup based on your needs:

- **Fast, stable, and open-source**: Go with **Lima**.
- **Maximum speed**: Use **Docker Desktop with file synchronization** or **OrbStack**.
- **Stable performance**: Use the **hybrid approach** with volumes with any solution.

## Introduction

**Two years ago** I wrote this post [Docker on MacOS is slow and how to fix it](https://www.paolomainardi.com/posts/docker-performance-macos/) which had decent success; it was featured on the [CNCF blog](https://www.cncf.io/blog/2023/02/02/docker-on-macos-is-slow-and-how-to-fix-it/) and trended on [Hacker News](https://news.ycombinator.com/item?id=34098367).

Despite the unexpected success, the goal was to explain all the moving parts of Docker when running in a **virtualized environment** like MacOS or Windows. What I found was that in **some circumstances, the performance was very poor**, especially when using bind mounts, a common strategy when developing applications with Docker. At that time, I proposed some strategies, like using [named volumes](https://www.paolomainardi.com/posts/docker-performance-macos/#volumes) instead of bind mounts, or even using [devcontainer](https://www.paolomainardi.com/posts/docker-performance-macos/#gui-editors--ide-users) to improve the developer experience.

Another technique I proposed was enabling the `VirtioFS` file sharing driver, which was still an experimental feature at that time but could improve the file system performance significantly.

Now, **almost two years later**, how have things changed? What is the current state of Docker on MacOS? Let's find out together.

## Linux Virtualization on MacOS

Before diving into some benchmarks, let's take a look at the current technologies that allow Docker to run on MacOS. We'll explore the **Virtualization Framework** and the **VIRTIO** standard, which are used by almost all virtualization solutions on MacOS, including those specifically designed for containers like Docker for Desktop, Lima, Rancher Desktop, Podman Desktop, etc.

### Virtualization Framework

One of the key elements of Docker solutions on MacOS is the **virtualization layer** that allows running Linux Virtual Machines on MacOS. This layer is called [Virtualization Framework](https://developer.apple.com/documentation/virtualization) and has been part of the Apple ecosystem since MacOS Big Sur, which was released in 2020 along with the first Apple Silicon Macs.

It is based on the [Apple Hypervisor Framework](https://developer.apple.com/documentation/hypervisor) but offers high-level APIs to manage virtual machines for MacOS and Linux. It also implements virtual devices, such as network interfaces and block devices, following the VIRTIO specifications. Another key feature is the ability to run x86_64 Linux binaries on [Apple Silicon through Rosetta 2](https://developer.apple.com/documentation/virtualization/running_intel_binaries_in_linux_vms_with_rosetta). This feature is particularly powerful as Rosetta is an extremely optimized translation layer, much faster than QEMU for this specific task and environment. Thanks to this integration, we can run `linux/amd64` containers when the `linux/arm64/v8` counterpart is unavailable.

{{< figure src="/images/posts/10-docker/macos-virt-diagram.webp" title="MacOS virtualization architecture" >}}

#### VirtIO drivers

The biggest decision Apple made with this framework was adopting the [VIRTIO](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html) standard to expose the host hardware to guest VMs as VirtIO drivers. This means that on the Linux side, we can use the same drivers as other hypervisors like KVM or QEMU, which are well-optimized and maintained by the Linux community. On the MacOS side, the system leverages the VirtIO kernel drivers implemented by Apple.

The architecture looks more or less like this:

{{< figure src="/images/posts/10-docker/macos-virtio.webp" title="Linux - MacOS VirtIO architecture" >}}

As shown in the diagram, the VIRTIO architecture comprises the following components:

1. **Frontend**: The driver running in the guest VM, responsible for communicating with the backend driver.
2. **Backend**: The driver running on the host, responsible for communicating with the frontend driver.
3. **VirtIO queue**: The communication channel between the frontend and backend drivers.

A real-world open-source example of this architecture can be found in QEMU. For instance, in virtio-net:

1. **Frontend**: https://github.com/qemu/qemu/blob/master/hw/net/virtio-net.c
2. **Backend**: https://github.com/qemu/qemu/blob/master/hw/net/virtio-net.c

Apple implemented the backend driver in the Virtualization Framework and exposed the VirtIO queues to guest VMs, allowing the Linux kernel to use VirtIO drivers to communicate with the host hardware.

As far as I know, the **Apple VirtIO drivers are not open source**. There are just [a few references in the XNU open-source repository](https://github.com/search?q=repo%3Aapple-oss-distributions%2Fxnu%20virtio&type=code). It's almost certain that everything is implemented in userspace, as confirmed by the currently exposed APIs: https://developer.apple.com/search/?q=virtio&type=Documentation.

Of course, I've simplified the architecture for clarity, but if you want to know more, I suggest reading the [VIRTIO specification](https://docs.oasis-open.org/virtio/virtio/v1.1/csprd01/virtio-v1.1-csprd01.html), the [Virtio on Linux](https://docs.kernel.org/driver-api/virtio/virtio.html) documentation, and the super-interesting RedHat article series _(which co-developed the standard with IBM)_ [Virtqueues and virtio ring: How the data travels](https://www.redhat.com/en/blog/virtqueues-and-virtio-ring-how-data-travels).

### libkrun and Docker VMM

Although the **Virtualization.framework** is a nice library covering many use cases, it suffers from being a closed-source project that cannot be extended. This means **only Apple can implement new features**, such as new devices or optimizations.

**Consider running an AI workload** inside a container that requires **GPU acceleration**. Thanks to the **virtio-gpu** driver, we can expose the host GPU to the guest VM. However, this is not possible with the current **Apple Virtualization.framework**, as it [only supports 2D acceleration](https://developer.apple.com/videos/play/wwdc2022/10002?time=1077), announced at WWDC 2022, with no further updates. Since it's a closed-source project, no one but Apple can enhance it.

This is where a new project called [libkrun](https://github.com/containers/libkrun) comes into play. This library offers a modern, **Rust-based Virtual Machine Monitor** that directly integrates with the **Hypervisor framework** for creating Virtual Machines on MacOS. It is fully open source (Apache 2.0), allowing for extensive customization.

I can't explain the project better than **Sergio Lopez** did in his blog post: ["Enabling containers to access the GPU on macOS"](https://sinrega.org/2024-03-06-enabling-containers-gpu-macos/). I highly recommend reading this super-interesting article.

Another project worth mentioning is [Docker VMM](https://docs.docker.com/desktop/features/vmm/), which, like **libkrun**, integrates with the low-level **Hypervisor.framework** to create and manage VMs on MacOS, instead of the native **Virtualization.framework**. The project is **still in beta** and is a **closed-source project**. From what the documentation says, its goal is to provide significant optimizations on both the Linux kernel and hypervisor sides.

From the [official documentation](https://docs.docker.com/desktop/features/vmm):

> **Docker VMM** brings exciting advancements specifically tailored for Apple Silicon machines. By optimizing both the Linux kernel and hypervisor layers, **Docker VMM delivers significant performance enhancements across common developer tasks**.

> Some key performance enhancements provided by Docker VMM include:
>
> - **Faster I/O operations**: With a cold cache, iterating over a large shared filesystem with `find` is 2x faster than when the Apple Virtualization Framework is used.
>
> - **Improved caching**: With a warm cache, performance can improve by as much as 25x, even surpassing native Mac operations.

Even though the project is **still in beta and closed-source**, **it's worth benchmarking** to see how it performs **compared to the Apple Virtualization Framework**.

{{< notice warning >}}
At the moment of writing, **Docker VMM** does not support **Rosetta 2** to run **x86_64** binaries on **Apple Silicon**. This is a limitation imposed by Apple on custom **hypervisors** different from the **Virtualization.framework**. I don't know if this will change in the future, but from what they said, they are working on it.
{{< /notice >}}

## Benchmarks

In the previous article, I used this repository [docker-for-mac-bench](https://github.com/paolomainardi/docker-for-mac-bench) to test filesystem performance in various scenarios. It's a simple project using a sample React application and runs a `npm install`. It's straightforward but effective. We'll reuse it now to compare the results with the previous ones.

### Tests

The tests that will be run are:

1. Native: Host machine without Docker.
2. Docker without volumes: A container without volumes.
3. Docker volume + mount: Bind mount `./create/react/app:/usr/src/app` and a volume on `nodemodules:/usr/src/app/node_modules`.
4. Docker bind mount: Bind mount `./create-react-app:/usr/src/app`.

This is another **good excuse** to make another Excalidraw diagram:

{{< figure src="/images/posts/10-docker/docker-benchmark-diagram.webp" title="Mounting options" >}}

As explained in [detail here](https://www.paolomainardi.com/posts/docker-performance-macos/), the core idea to keep in mind is that bind mounting is always the slowest and costliest option, as it **requires HOST to VM file-system sharing**, like **VirtioFS**.

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

- [Docker for Desktop](https://docs.docker.com/desktop/setup/install/mac-install/): _4.37.1_
  - **Closed source** and [free for small businesses (fewer than 250 employees AND less than $10 million in annual revenue)](https://docs.docker.com/subscription/desktop-license/).
  - **Apple Virtualization Framework** + **VirtioFS**
  - **Docker VMM** + **VirtioFS**
  - **Apple Virtualization Framework** + **VirtioFS** + **Synchronized file sharing**
- [Lima](https://www.cncf.io/projects/lima/): _1.0.3_
  - **Open source** (Apache 2.0)
  - **Apple Virtualization Framework** + **VirtioFS**
- [OrbStack](https://orbstack.dev/): _1.9.2_
  - **Closed source** - [Pricing](https://orbstack.dev/pricing) and [Licensing](https://docs.orbstack.dev/licensing)
  - **As it's a closed source project** I can only guess that is based on **Apple Virtualization Framework** _(I guess it because it supports Rosetta 2 out of the box)_. You can find more information here: https://docs.orbstack.dev/faq

{{< notice info >}}
[Docker Synchronized file sharing](https://www.docker.com/blog/announcing-synchronized-file-shares/) is a **paid feature** of Docker for Desktop that uses [Mutagen](https://github.com/mutagen-io/mutagen), [acquired by Docker in 2023](https://www.docker.com/blog/mutagen-acquisition/), to provide a 2-way file synchronization between the host and the guest VM, which should overcome the performance issues of bind mounts.

Theoretically, **the same technology** can be used in **other platforms**, like **Lima**, using [ddev](https://ddev.readthedocs.io/en/stable/users/install/performance/#mutagen). However, **it will not be tested in this benchmark** as I want to stick to what the platforms **offer out of the box**. You can see some benchmarks on the [ddev blog](https://ddev.com/blog/docker-performance-2023/).
{{< /notice >}}

#### Linux

- **Docker**: 27.3.1

{{< notice info >}}

Both are configured with `8vCPU` and `16GB` of memory. Docker for Desktop is installed with brew and manually configured, as the current CLI does not provide a way to configure the settings. Instead, `Lima` is installed and configured as follows:

```shell
limactl create --name=default --vm-type=vz --mount-type=virtiofs --mount-writable --memory=16 --cpus=8 --disk=100 template://docker-desktop
```

```shell
docker context create lima-default --docker "host=unix:///Users/paolomainardi/.lima/default/sock/docker.sock"
docker context use lima-default
```

The nicest thing is that we can have both Docker for Desktop and Lima running on the same machine, and simply change the Docker context we want:

```shell
✉ docker context ls
NAME             DESCRIPTION                               DOCKER ENDPOINT                                              ERROR
default          Current DOCKER_HOST based configuration   unix:///var/run/docker.sock
desktop-linux    Docker Desktop                            unix:///Users/paolomainardi/.docker/run/docker.sock
lima-default *
```

{{< /notice >}}

I'm especially interested in the performance of [Lima](https://github.com/lima-vm/lima) as it's a [CNCF Open Source project](https://www.cncf.io/projects/lima/). In [Sparkfabrik](https://www.sparkfabrik.com/), we are still defaulting to **Docker for Desktop**, but we are evaluating switching to other solutions like **Lima**, to keep our stack as Open Source as possible.

### Results

| OS        | Platform           | Test Type           | Average Time (s) | Range (s)     |
| --------- | ------------------ | ------------------- | ---------------- | ------------- |
| MacOS     | Lima               | Native              | 3.38             | 3.00-3.63     |
| MacOS     | Lima               | No volumes          | 3.70             | 3.55-3.85     |
| MacOS     | Lima               | Bind mount + volume | 3.96             | 3.87-4.02     |
| **MacOS** | Lima               | **Bind mount**      | **8.99**         | **8.86-9.10** |
| MacOS     | Docker-VZ          | Native              | 3.37             | 3.00-3.56     |
| MacOS     | Docker-VZ          | No volumes          | 3.75             | 3.55-3.90     |
| MacOS     | Docker-VZ          | Bind mount + volume | 3.61             | 3.55-3.70     |
| **MacOS** | **Docker-VZ**      | **Bind mount**      | **9.53**         | **9.44-9.63** |
| MacOS     | Docker-VMM         | Native              | 3.35             | 3.00-3.53     |
| MacOS     | Docker-VMM         | No volumes          | 3.65             | 3.50-3.80     |
| MacOS     | Docker-VMM         | Bind mount + volume | 3.42             | 3.38-3.44     |
| **MacOS** | **Docker-VMM**     | **Bind mount**      | **8.47**         | **8.25-8.60** |
| MacOS     | Docker-VZ-sync     | Native              | 4.19             | 3.48-4.67     |
| MacOS     | Docker-VZ-sync     | No volumes          | 3.80             | 3.70-3.90     |
| MacOS     | Docker-VZ-sync     | Bind mount + volume | 4.06             | 3.94-4.30     |
| **MacOS** | **Docker-VZ-sync** | **Bind mount**      | **3.88**         | **3.83-3.94** |
| MacOS     | OrbStack           | Native              | 3.61             | 3.54-3.75     |
| MacOS     | OrbStack           | No volumes          | 3.28             | 3.20-3.39     |
| MacOS     | OrbStack           | Bind mount + volume | 3.19             | 3.14-3.29     |
| **MacOS** | **OrbStack**       | **Bind mount**      | **4.22**         | **4.15-4.27** |
|           |                    |                     |
| Linux     | Docker-Linux       | Native              | 5.32             | 5.29-5.36     |
| Linux     | Docker-Linux       | No volumes          | 5.29             | 5.22-5.34     |
| Linux     | Docker-Linux       | Bind mount + volume | 5.22             | 5.20-5.23     |
| **Linux** | **Docker-Linux**   | **Bind mount**      | **5.29**         | **5.23-5.33** |

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

1. **OrbStack's Notable Performance**
   Among the tested platforms, **OrbStack stands out with its impressive performance**, especially in scenarios involving **bind mounts and native operations**. With a **bind mount time of 4.22 seconds**, OrbStack outperforms both standard Docker Desktop and Lima in similar tests. This suggests that OrbStack leverages the **Apple Virtualization Framework** more efficiently, likely with additional optimizations for file-sharing mechanisms. Developers looking for a blend of speed and ease of use may find OrbStack to be a compelling option.

1. **Bind Mounts Performance Impact**
   [As previously documented](https://www.paolomainardi.com/posts/docker-performance-macos/#volumes-vs-bind-mounts), **bind mounts remain the slowest option**, running approximately **3x slower than native operations**. However, there's notable progress: previous benchmarks showed bind mounts being 5-6x slower, indicating significant **VirtIOFS performance improvements** on MacOS.

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

## Conclusions

After **two years** from my first analysis, the **Docker ecosystem** on MacOS has significantly evolved. Here are the main takeaways from our benchmarks:

1. **Performance Has Improved**

   The **VirtIOFS** improvements are notable - **bind mount** operations are now only **3x slower** than native operations, compared to **5-6x slower** two years ago. This is a substantial improvement in daily development workflows.

2. **New Solutions Are Emerging**

   The introduction of **Docker VMM**, the maturity of **Lima**, and the strong performance of **OrbStack** show how the ecosystem is evolving. Lima and OrbStack prove to be viable alternatives to **Docker Desktop**, each excelling in different areas.

3. **File Synchronization is Game-Changing**

   Docker's **file synchronization** feature shows impressive results, reducing bind mount operation times by **59%**. However, being a **paid feature**, developers need to evaluate if the performance boost justifies the cost for their specific needs.

4. **Best Practices Still Matter**

   While the "No volumes" approach generally offers the best raw performance, it lacks data persistence between container restarts. The **hybrid approach** (combining bind mounts with volumes) continues to provide a good balance of **performance and functionality** across all configurations. This reinforces our previous recommendations about leveraging volumes for efficient I/O operations, while using bind mounts for code that needs to be easily accessible.

5. **Platform Choice Matters**

   While Docker on **Linux** shows consistent performance regardless of the configuration, **MacOS** users need to carefully consider their setup based on their specific needs:

   - For hobby projects or small applications, any solution works fine
   - For maximum raw performance, the **No volumes** approach offers the best speed
   - For larger projects with frequent restarts, either **Docker with file synchronization** or **OrbStack** could be the best choice
   - The **hybrid approach** with volumes offers a good balance between performance and developer experience

Looking forward, we can expect further improvements in the MacOS Docker ecosystem, especially with new projects like **Docker VMM** and the continuous development of **Lima** and **OrbStack**. The gap between native Linux performance and MacOS virtualized environments continues to narrow, making Docker on MacOS an increasingly viable option for development workflows.

{{< notice tip >}}
If you're setting up a new development environment on MacOS today, I recommend:

- Using **Lima** if you prefer **open-source** solutions, as it offers comparable performance to Docker Desktop, sometimes even outperforming it.
- Using **OrbStack** for a blend of speed and usability, as it achieves strong performance across multiple test scenarios and has the fastest "No volumes" implementation.
- Using **Docker Desktop** with **file synchronization** if using closed-source and budget isn't a constraint.
- Consider the **No volumes** approach for maximum performance when data persistence between container restarts isn't needed.
- Implementing the **hybrid approach** with volumes for a good balance of performance and developer experience - see the [previous article](https://www.paolomainardi.com/posts/docker-performance-macos/) with some examples.
  {{< /notice >}}

Thanks for reading all of this, and if you find something wrong or want to discuss some topics further, get in touch with me. As always you can leave your comments here: https://github.com/paolomainardi/paolomainardi.com/discussions/38 or reach me on the contacts you can find [here](/about).

## Data and diagrams

1. Excalidraw diagrams (read-only link): https://excalidraw.com/#json=FD3dYVkiXvQ9xHeZ2Pgfy,5tVt2hukDYlki3qwzMI15w
2. Benchmark results: [data.csv](./assets/docker-mac-bench.csv)

## References

Here a list of some very random references I've collected during my research:

1. [What makes Docker VMM better than Apple Virtualization Framework?](https://github.com/docker/for-mac/issues/7464)
2. [Docker VMM](https://docs.docker.com/desktop/features/vmm/)
3. [REDHAT - vfkit - A macOS hypervisor using Apple's virtualization framework](https://crc.dev/blog/Container%20Plumbing%202023%20-%20vfkit%20-%20A%20minimal%20hypervisor%20using%20Apple%27s%20virtualization%20framework.pdf)
4. [vz - Go binding with Apple Virtualization.framework](https://github.com/Code-Hex/vz)
5. [vfkit - Simple command line tool to start VMs through the macOS Virtualization framework](https://github.com/crc-org/vfkit)
6. [What Are the Latest Docker Desktop Enterprise-Grade Performance Optimizations?](https://www.docker.com/blog/what-are-the-latest-docker-desktop-enterprise-grade-performance-optimizations/#boost-performance-Docker-VMM)
7. [Tart is a virtualization toolset to build, run and manage macOS and Linux virtual machines on Apple Silicon](https://tart.run/)
8. [Podman 5.2 Enhances macOS VMs with GPU Support](https://linuxiac.com/podman-5-2-enhances-macos-vms-with-gpu-support/)
9. [Introduction to VirtIO](https://blogs.oracle.com/linux/post/introduction-to-VirtIO)
10. [Virgl not functionning under Apple's virtualization.framework](https://github.com/utmapp/UTM/discussions/5482)
11. [macOS Docker Provider Performance, November 2023](https://ddev.com/blog/docker-performance-2023/)
