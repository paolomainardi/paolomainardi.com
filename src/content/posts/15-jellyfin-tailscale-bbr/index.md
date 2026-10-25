+++
date = "2026-10-25"
title = "How to improve (a lot) TCP streaming for Jellyfin on a Tailscale network"
description = "Why a 4K stream stalled at 20 Mbps over Tailscale, and how switching one container from CUBIC to BBR took it past 100 Mbps."
slug = "improve-tcp-streaming-jellyfin-tailscale-bbr"
tags = ["linux", "networking", "tcp", "tailscale", "proxmox", "homelab", "ai", "agents"]
draft = "true"
toc = true
featuredImage = "/images/posts/15-jellyfin-tailscale-bbr/network.webp"
images = ["/images/posts/15-jellyfin-tailscale-bbr/network.webp"]
+++

## TL;DR

My **Jellyfin** server streams to an Apple TV in another city over **Tailscale**, and 4K files kept stalling. The tunnel was fine: a single TCP connection to the Apple TV crawled at **17 to 22 Mbps** because the path drops about 3% of packets, and **CUBIC**, the default Linux congestion control, reads every loss as congestion. Switching only the reverse proxy container to **[BBR](https://queue.acm.org/detail.cfm?id=3022184)** took the same connection to **110 to 340 Mbps**. One kernel module on the host, one sysctl in one container, no restart.

## Introduction

It was a Sunday evening. I was on the couch, with my phone, and my Apple TV was stuttering on a 4K movie streamed from my NAS, which sits in another city.

I did not have a theory. I opened a [Claude Code Remote Control](https://code.claude.com/docs/en/remote-control) session on my workstation from the phone and told the agent to investigate: first the Proxmox host, then the container where Jellyfin runs. About fifteen minutes later the stream was smooth, the fix was persistent and committed to the repository that holds the NAS configuration.

This post is about what it found, because the answer is not where I expected it, and it applies to anyone serving video, backups or large files over a VPN with some packet loss on the way.

## The setup

The NAS is a small **[Proxmox VE](https://www.proxmox.com/en/proxmox-virtual-environment/overview)** box with an Intel N5095, 32 GB of RAM and ZFS. Everything runs in **LXC containers**, which share the host kernel:

- **Tailscale**: a container that joins my tailnet and acts as a [subnet router](https://tailscale.com/kb/1019/subnets) towards an internal bridge.
- **Nginx Proxy Manager**: the reverse proxy, which terminates TLS and forwards each request to the right service. This is the container that sends the video to the client.
- **Jellyfin**: a Docker container inside an LXC container, with Intel Quick Sync for transcoding and the media on a ZFS pool of hard disks.

The client is **Infuse** on an Apple TV in a remote location, with the Tailscale app installed on the Apple TV itself.

{{< figure src="/images/posts/15-jellyfin-tailscale-bbr/network.webp" caption="The path of one video request. The TCP connection that matters runs from the reverse proxy to the Apple TV, inside the WireGuard tunnel. Its sender, the proxy, is the only place where congestion control can be changed." >}}

## A primer on TCP congestion control

Before the investigation, a little background, because the whole story is about it.

TCP does not know how fast the path between two machines is. The **congestion control** algorithm guesses: it decides how much data can be in flight, unacknowledged, at any moment. That amount is the **congestion window**, and divided by the round trip time it gives the speed of the connection. With a 30 millisecond round trip, a window of 60 packets of 1,228 bytes is about 20 Mbps, no matter how fast the lines at either end are.

On Linux, congestion control is a pluggable kernel module. You can see what is loaded and what is in use:

```bash
sysctl net.ipv4.tcp_available_congestion_control
# net.ipv4.tcp_available_congestion_control = reno cubic

sysctl net.ipv4.tcp_congestion_control
# net.ipv4.tcp_congestion_control = cubic
```

Three names are worth knowing:

- **Reno**: the classic algorithm. It grows the window by one packet per round trip and halves it on every loss.
- **[CUBIC](https://www.rfc-editor.org/rfc/rfc9438)**: the default in Linux, Windows and Apple systems, standardized as RFC 9438. It grows the window along a cubic curve, so it recovers faster on fast, long links. But it is still **loss based**: a lost packet means congestion, and the window shrinks.
- **[BBR](https://queue.acm.org/detail.cfm?id=3022184)** (Bottleneck Bandwidth and Round-trip propagation time): published by Google in 2016 and in Linux [since 4.9](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=0f8782ea14974ce992618b55f0c041ef43ed0b78). It does not treat loss as the signal. It keeps measuring the delivery rate and the minimum round trip time, and paces its sending to match the bandwidth it has observed.

The difference shows up on paths with **random loss that is not caused by congestion**: Wi-Fi, mobile networks, long routes across providers, a tunnel over UDP. There CUBIC keeps cutting its window for losses that have nothing to do with a full queue, and never reaches the speed the path could give. Google reported a [4% average throughput gain for YouTube globally, and more than 14% in some countries](https://cloud.google.com/blog/products/networking/tcp-bbr-congestion-control-comes-to-gcp-your-internet-just-got-faster), when it moved its servers to BBR.

BBR only needs to change on the **sender**. The receiver, my Apple TV, does not need to know anything about it.

## The investigation

The agent started from the server and moved outwards, ruling things out one at a time:

- **Not transcoding.** Infuse was using **direct play**: Jellyfin was sending the file as it is, a 22.5 GB HEVC Main10 file with Dolby Vision, about **25 Mbps** on average and well above that in the 4K peaks.
- **Not the NAS.** CPU and disks were idle, and the NAS uplink measures about 900 Mbps. Jellyfin had data **queued in the socket**, waiting to go out: the server was faster than the network.
- **Not a relay.** This was my first suspect. Tailscale tries to connect devices [directly, punching through NAT](https://tailscale.com/blog/how-nat-traversal-works/), and when that fails it falls back to a **DERP relay**, which [adds latency and caps throughput](https://tailscale.com/kb/1638/poor-performance-tailnet) to stay fair to everyone. `tailscale ping` shows which one you get:

  ```bash
  tailscale ping apple-tv
  # pong from apple-tv (100.x.y.z) via <public ip>:40323 in 27ms
  ```

  `via <ip>:<port>` is a direct connection. A relayed one says `via DERP(...)`.
- **Not the tunnel.** A single TCP stream from the NAS to my workstation, over the same Tailscale setup, ran at **567 to 672 Mbps**, with SSH encryption on top.

What was left was one TCP connection: the one from Nginx Proxy Manager to the Apple TV. `ss -tni` on the proxy container shows the kernel's view of every socket, and this one was clear:

```text
cubic ... rtt:30.765/1.382 mss:1228 cwnd:68 ssthresh:46 bytes_retrans:8596
          bytes_acked:20114394 delivery_rate 22071960bps
```

A congestion window of **68 packets** at a 30 millisecond round trip: about **22 Mbps**, below the average bitrate of the file. The player drains its buffer faster than the network fills it, and the movie stops.

## Why CUBIC was stuck

The path to the remote location loses packets. Later, with BBR, about **3%** of the data had to be retransmitted. CUBIC never pushes the path that hard. Each loss cuts the window, the window never grows past a few dozen packets, and the connection settles at a fraction of what the path can carry.

That also explains the confusion. Tailscale looked guilty because the slow connection was the one inside the tunnel, but the tunnel was carrying everything it was asked to. The problem was how the sender reacted to a lossy path.

## The fix, one container at a time

LXC containers share the host kernel, but each container has its **own network namespace**, and the congestion control setting is per namespace. That means BBR can be turned on for the proxy, the container that sends the video, and nowhere else.

Loading the module only makes BBR **available**. The host default stays CUBIC, so SSH and the Tailscale container are untouched.

An unprivileged container cannot load kernel modules, so the module goes on the host first:

```bash
# On the Proxmox host
modprobe tcp_bbr

# In the proxy container (CT 102 here)
pct exec 102 -- sysctl -w net.ipv4.tcp_congestion_control=bbr
```

No restart is needed. The setting applies to **new** connections, and Infuse opens new ones all the time, so stopping and starting the movie was enough. BBR also ran fine on the existing `fq_codel` queue.

Then the same socket again:

```text
bbr ... rtt:35.397 cwnd:3256 bytes_retrans:5273032 bytes_acked:168143702
        pacing_rate 337155528bps
```

A window of over **3,000 packets**, about 168 MB delivered in 25 seconds, and smooth playback.

To make it survive a reboot, two files:

```bash
# Host: load the module at boot
echo tcp_bbr > /etc/modules-load.d/bbr.conf

# Proxy container: use BBR
echo net.ipv4.tcp_congestion_control=bbr > /etc/sysctl.d/90-bbr.conf
```

Rolling back is one command: `sysctl -w net.ipv4.tcp_congestion_control=cubic` in the container.

## The numbers

Every number below comes from `ss -tni` on the same socket, sampled every few seconds while the movie played: twice with CUBIC, four times with BBR. They are samples from one evening on one path, not a benchmark.

{{< chart type="bar" data="throughput.csv" y="measure" x="median" highlight="BBR" unit="Mbps" axis="Megabits per second, median of the samples, more is faster" notes="throughput-notes.csv" >}}
Delivery rate of the connection to the Apple TV. CUBIC stayed under the bitrate of the file; BBR was about ten times faster at the median, on the same path.
{{< /chart >}}

The price is visible too. BBR keeps sending through loss, so it retransmits more:

{{< chart type="bar" data="retransmits.csv" y="algorithm" x="percent" highlight="BBR" unit="%" axis="Share of bytes retransmitted, fewer is better" >}}
Retransmitted bytes over bytes sent on the same connection. CUBIC barely loses anything because it never pushes the path; BBR uses the path and pays about 3% in retransmissions.
{{< /chart >}}

{{< notice note >}}
BBR is not free. The Linux kernel still ships the first version of BBR, which is known to [retransmit more and to compete unfairly with CUBIC flows](https://www3.cs.stonybrook.edu/~anshul/imc19_bbr.pdf) on a shared bottleneck. Google's [BBRv3](https://github.com/google/bbr/tree/v3), being standardized at the [IETF](https://datatracker.ietf.org/doc/html/draft-ietf-ccwg-bbr), addresses part of this but is not in the mainline kernel yet. For one proxy streaming to a few clients at home, this is a trade I take without thinking twice. On a busy shared link, measure first.
{{< /notice >}}

## How to apply it to your network

1. **Check the path first.** Run `tailscale ping` to the client. If it goes through DERP, fix NAT traversal before anything else, or look at [peer relays](https://tailscale.com/blog/peer-relays-beta).
2. **Measure one connection, not the line.** `ss -tni` on the sender shows the algorithm, the congestion window, the round trip and the delivery rate of each socket. A small window and some retransmissions on a fast line point at congestion control.
3. **Change the sender only.** Load `tcp_bbr` on the host and enable it in the container that serves the traffic, often the reverse proxy. The rest of the host keeps CUBIC.
4. **Test with new connections**, then make it persistent with `/etc/modules-load.d/` on the host and `/etc/sysctl.d/` in the container, and commit both files wherever you keep your configuration.

## Conclusion

What surprised me was not BBR. It was that the first analysis was correct, and how much knowledge of networks and operating systems sat behind it. This is the work of a Linux network engineer, and in any other scenario it would have taken me hours, or days. Here it took one Remote Control session from the couch.

If you have questions or just want to talk about TCP, Tailscale or homelabs, just drop me a message [here](https://github.com/paolomainardi/paolomainardi.com/discussions).
