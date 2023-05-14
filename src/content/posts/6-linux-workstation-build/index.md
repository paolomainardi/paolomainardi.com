+++
date = "2023-05-14"
title = "How I Built My Perfect Linux Workstation"
slug = "linux-workstation-build"
tags = ["linux", "hardware", "pc", "build", "wood"]
draft = "false"
featuredImage = "images/posts/6-linux-workstation/featured.webp"
images = ["images/posts/6-linux-workstation/featured.webp"]
+++

> How the actual build look like.

## TL;DR

This is not a guide on how-to install and configure Linux, but a list of the components I used to build my perfect Linux workstation, to avoid any compatibility issue and to exploit the best in terms of performance and stability. For who's asking, I am using [Arch Linux](https://archlinux.org/) as my daily driver and it is configured through the [Ansible playbook](https://github.com/paolomainardi/archlinux-ansible-provisioner) i made.

## Introduction
The last time I built (*assembled*) a PC, there still were [IDE ribbon cables](https://en.wikipedia.org/wiki/Ribbon_cable), the CPU didn’t strictly require a cooler, and 3Dfx was the best in class GPU you can have, floppy disk reader to boot OS (years later, BIOS became smarter enough to boot from USB or CD-ROM), no LED or other fancy stuff on the case, just a metal and cheap plastic white case with some activity led for the spinning drives and sometimes, the luckiest ones, [the mythical turbo button](https://en.m.wikipedia.org/wiki/Turbo_button) (well to be honest the turbo button disappeared after 486 CPUs).

They were enjoyable days; Amazon or such wasn’t a thing; to buy components, you should physically go to local computer stores; the primary source of information to choose the best product were PC magazines, weekly or monthly, released on the newsstand.

What do I remember most of that days as a PC enthusiast? Three things:

1. [Pentium 90 with **MMX extensions**](https://en.wikipedia.org/wiki/Pentium_(original)#cite_note-4) - the first ever X86 multimedia extensions baked into a CPU, they could add a considerable amount of FPS. Still, of course, they required new games or substantial patches, [and it was very hard at the beginning to find MMX-supported games](https://archive.nytimes.com/www.nytimes.com/library/cyber/week/012497intel.html) or applications, so it was quite a disappointment.
2. The first **3Dfx card** with [bilinear filtering in action](https://www.vgamuseum.info/index.php/cpu/item/867-bilinear-filtering) - this kind of technology changed everything; it was like having an arcade at home; everything was so smooth, fast, and sharp as never before; this was the beginning of a new era of gaming and the fast decline of arcades.

[https://www.youtube.com/watch?v=mN7wFjfs5OA&ab_channel=SUCRA](https://www.youtube.com/watch?v=mN7wFjfs5OA&ab_channel=SUCRA)

1. **LINUX -** Still vivid memories of Installing Debian for the first time with [select](https://en.wikipedia.org/wiki/Dselect), apt-get was not yet invented, and how easy it was to finish in the land of [Dependency Hell](https://wiki.debian.org/DependencyHell).
Still, when you finally succeeded, it was mind-blowing; running in your computer a real UNIX-like system for free and having the opportunity to assemble your operating system from the ground up and making your hand dirty with terminals and stuff was very fun, and still, [it is.](https://github.com/paolomainardi/archlinux-ansible-provisioner)

{{< notice tip >}}

**AI GENERATED**

If you want to experience some nostalgia for the 90s hacker culture, you can watch the following movies:

- Hackers (1995)
- Sneakers (1992)
- The Net (1995)
- WarGames (1983)

These movies may not be the most accurate representation of hacking, but they capture the era's spirit and can be pretty entertaining to watch.

{{< /notice >}}

Fast forward to nowadays and why I have chosen to assemble a PC again.

The idea was quite simple, as the work today is almost totally done at home; why be limited by using just a laptop, which is very limited in terms of computing power and expandability, when I could have run something powerful capable of making me run several browsers, containers, runtimes, and Kubernetes clusters without sacrificing performance and let me free to choose and upgrade components, the best in class for Linux compatibility.

And last but not least, I was so curious to dive deep into the modern PC building ecosystem and to get my hands dirty again.

So once the idea became a bit more solid and even thanks to some new coming projects (*the best excuse ever 😎)*, I started to write down the workstation requirements.

## Requirements

- First and foremost, **everything must run natively on Linux as a first-class citizen**, and even better if the vendor supports everything baked into the Kernel.
- Air or liquid cooling, **ultra-silent** and **power efficient**.
- **Integrated GPU** as I don’t run games but still something powerful enough to accelerate video and desktop stuff and to drive one or multiple external 4K monitors.
- A **platform** still **supported for at least the next 3 years** to let me upgrade parts such as RAM and CPU without changing everything.
- Capable of supporting at least 128GB of ECC RAM
- At least 2 NVMe PCIe 4.0 slots and a bunch of high-speed SATA ports.
- A **solid**, **professional-looking ATX case** with plenty of room to do nice and clean cable management.
- **💰 Budget ~1500€**

## Software

Regarding the operating system, it has been over 3 years since I’ve been in love with **[Arch Linux](https://github.com/paolomainardi/archlinux-ansible-provisioner)**, after many years of Debian-based distributions like Ubuntu or generally no rolling release distributions.

Arch Linux is a "[lightweight and flexible Linux distribution that tries to keep it simple](https://archlinux.org/)."

Why did I make this switch? That is a very good question! There are several reasons:

1. Things in hardware and OSS are moving fast, LTS distributions tend to age very quickly, like Kernel, media subsystems, or Desktop Environments, with a rolling release distribution you have always the most updated software or kernel, this means better hardware support and new features.
2. Rolling release does not mean instability by design, as many could think, it is more having always the latest stable versions, this accelerate 3 factors: new features, deprecation and removals, you should just know this.
3. [Archlinux Wiki](https://wiki.archlinux.org/) is the greatest piece of documentation ever written by a community
4. [AUR](https://aur.archlinux.org/) with all its defects it is the best and usable (PPA i am looking at you, yes) which is a community-driven repository of software packages that are not available in the official repositories, you can find packaged basically everything.
5. I can build a system exactly with the components i need, the distribution doesn’t come with an opinionated installation set of packages.

I used the [Arch Linux Ansible Provisioner](https://github.com/paolomainardi/archlinux-ansible-provisioner) that I wrote to automate the installation and configuration. This tool automates the entire process, from partitioning the disk to installing the necessary packages and configuring the system. It also installs and configures my preferred desktop environment, which is now the [Sway](https://swaywm.org/) window manager, [Wayland rocks](https://wiki.archlinux.org/title/wayland).

To bootstrap this system i didn’t reinstalled from scratch, i’ve cloned another NVMe disk with [Clonezilla](https://clonezilla.org/) even capable to work with encrypted disks and then enlarged the filesystem to fit the new 1TB size, that’s it, everything worked out of the box.

Some system data:

```shell {inline=true}

❯ inxi -F

System:
  Host: paolo-cto-arch Kernel: 6.3.1-arch1-1 arch: x86_64 bits: 64
    Desktop: sway v: 1.8.1 Distro: Arch Linux
Machine:
  Type: Desktop System: ASUS product
  Mobo: ASUSTeK model: PRIME X670E-PRO WIFI v: Rev 1.xx
    serial: UEFI: American Megatrends v: 1408
    date: 04/10/2023
CPU:
  Info: 12-core model: AMD Ryzen 9 7900X bits: 64 type: MT MCP cache:
    L2: 24 MiB
  Speed (MHz): avg: 3129 min/max: 3000/5733 cores: 1: 3311 2: 2981 3: 3000
    4: 3000 5: 3000 6: 3000 7: 2879 8: 3000 9: 3000 10: 3000 11: 3000 12: 3000
    13: 4512 14: 3000 15: 3000 16: 3000 17: 2879 18: 2854 19: 3000 20: 3000
    21: 3000 22: 3000 23: 4700 24: 3000
Graphics:
  Device-1: AMD Raphael driver: amdgpu v: kernel
  Device-2: Logitech C920 HD Pro Webcam driver: snd-usb-audio,uvcvideo
    type: USB
  Display: wayland server: X.org v: 1.21.1.8 with: Xwayland v: 23.1.1
    compositor: sway v: 1.8.1 driver: X: loaded: amdgpu dri: radeonsi
    gpu: amdgpu resolution: 2560x1440~60Hz
  API: OpenGL v: 4.6 Mesa 23.0.3 renderer: AMD Radeon Graphics (gfx1036
    LLVM 15.0.7 DRM 3.52 6.3.1-arch1-1)
Audio:
  Device-1: AMD Rembrandt Radeon High Definition Audio driver: snd_hda_intel
  Device-2: AMD Family 17h/19h HD Audio driver: snd_hda_intel
  API: ALSA v: k6.3.1-arch1-1 status: kernel-api
  Server-1: PipeWire v: 0.3.70 status: active
Network:
  Device-1: Realtek RTL8125 2.5GbE driver: r8169
  IF: eno1 state: up speed: 1000 Mbps duplex: full mac: c8:7f:54:03:4c:5d
  Device-2: MEDIATEK MT7921K Wi-Fi 6E 80MHz driver: mt7921e
  IF: wlp10s0 state: down mac: 72:6a:6d:65:09:60
  Device-1: MediaTek Wireless_Device driver: btusb type: USB
  Report: rfkill ID: hci0 rfk-id: 24 state: down bt-service: enabled,running
    rfk-block: hardware: no software: yes address: see --recommends
Drives:
  Local Storage: total: 1.36 TiB used: 121.42 GiB (8.7%)
  ID-1: /dev/nvme0n1 vendor: Samsung model: SSD 980 PRO 1TB size: 931.51 GiB
  ID-2: /dev/nvme1n1 vendor: Western Digital model: WDS500G1X0E-00AFY0
    size: 465.76 GiB
Partition:
  ID-1: / size: 880.97 GiB used: 121.28 GiB (13.8%) fs: btrfs dev: /dev/dm-0
  ID-2: /boot size: 1022 MiB used: 139.6 MiB (13.7%) fs: vfat
    dev: /dev/nvme0n1p1
  ID-3: /home size: 880.97 GiB used: 121.28 GiB (13.8%) fs: btrfs
    dev: /dev/dm-0
Swap:
  ID-1: swap-1 type: partition size: 49.52 GiB used: 4 KiB (0.0%)
    dev: /dev/nvme0n1p3
Sensors:
  System Temperatures: cpu: 48.0 C mobo: N/A gpu: amdgpu temp: 42.0 C
  Fan Speeds (RPM): N/A
```

## Hardware

First, I will provide the parts, and then I'll provide the rationale for each.

| Component | Model | Amazon US | Amazon IT |
| --- | --- | --- | --- |
| Case | Fractal Design North White | https://amzn.to/3NMrfgU | https://amzn.to/3VFNjvG |
| Motherboard | ASUS PRIME X670E-PRO WIFI | https://amzn.to/44ECyy0 | https://amzn.to/41fNAqu |
| CPU |  AMD Ryzen 9 7900X | https://amzn.to/424XFYt | https://amzn.to/3NQkLxE |
| Cooler | Noctua NH-D15 chromax.Black | https://amzn.to/3VN4cos | https://amzn.to/42wwvtd |
| Cooler white cover | Noctua NA-HC4 chromax.white hatsink cover | https://amzn.to/3NJyK8z | https://amzn.to/3NLG9UM |
| RAM | Kingston Technology Fury Beast 32GB (2x32GB) 6000MT/s DDR5 CL36 | https://amzn.to/42tWRN4 | https://amzn.to/44PbE6p |
| NVMe | Samsung 980 PRO 1TB | https://amzn.to/3HJYUEg | https://amzn.to/3HPLO8t |
| Power Supply | EVGA SuperNOVA 650 P6 Platinum 650W | https://amzn.to/44DhMhV | https://amzn.to/3VKes0v |
| Cable mod | CableMod Pro ModMesh Sleeved Cable Extension Kit (White) | https://amzn.to/42A0SyY | https://amzn.to/3VIlymr |
| Thermal paste | ARCTIC MX-4 | https://amzn.to/3HMU35p | https://amzn.to/42t4X8N |

### Platform

Given this list of requirements, the final choice was to go all-in on the new [AMD AM5 platform](https://en.wikipedia.org/wiki/Socket_AM5) with [Zen4 CPU architecture](https://en.wikipedia.org/wiki/Zen_4), which satisfies most requirements.

Here is the launch presentation of the new platform:

[https://www.youtube.com/watch?v=BRtBB2VnF8M&ab_channel=AMD](https://www.youtube.com/watch?v=BRtBB2VnF8M&ab_channel=AMD)

There are tons of new features ([here is a very good article from Artstechnica](https://arstechnica.com/gadgets/2022/09/everything-you-need-to-know-about-zen-4-socket-am5-and-amds-newest-chipsets/)); in brief:

1. 28 lanes of PCIE 5.0
2. DDR5
3. Up to four 10Gbps USB 3.2 Gen 2
4. Integrated iGPU based on RDNA2 for the CPUs gen 7000
5. New socket AM5 [supported till at least 2025](https://www.pcgamer.com/amd-am5-support-thru-2025/) and a new set of [chipset](https://www.amd.com/en/chipsets/am5)

I have found everything I needed and more to meet my requirements. I considered Intel, but the platform based on [LGA1700](https://en.wikipedia.org/wiki/LGA_1700) is supposedly [reaching its end of life](https://www.pcworld.com/article/1364031/will-intel-use-the-lga-1700-socket-for-meteor-lake-cpus.html). On the other hand, AMD has proven in recent years that it [can support its platform for years.](https://community.amd.com/t5/gaming/let-s-talk-desktop-pcs-is-your-platform-an-investment-or-a/ba-p/560176)

Another interesting point I didn’t know before is that, unlike DDR4, all [DDR5 chips have on-die ECC](https://en.wikipedia.org/wiki/DDR5_SDRAM), where errors are detected and corrected before sending data to the CPU, [here](https://www.youtube.com/watch?v=XGwcPzBJCh0&ab_channel=TechTechPotato) is explained how it is supposed to work.
TL;DR: DDR5 on-die ECC is not equivalent to ECC, and still, DDR5 ECC modules if you want the full feature.

At first, I was apprehensive about the steep prices. During the platform's launch, the market struggled with a silicon shortage, which added to the cost. However, prices have since decreased considerably and are even more affordable than the previous platform at the same stage of its lifecycle.

Linux compatibility is superb and is maturing [release after release](https://www.phoronix.com/news/Linux-6.3-AMD-Features).

### Motherboard

This was the hardest part; as I mentioned before, there are [4 new chipset variants](https://www.amd.com/en/chipsets/am5) for this platform.

![am5 chipsetss](/images/posts/6-linux-workstation/am5-chipsets.webp)

You can find here [how they differ in depth](https://www.anandtech.com/show/17585/amd-zen-4-ryzen-9-7950x-and-ryzen-5-7600x-review-retaking-the-high-end/4). Still, the biggest difference is how many PCI Express 5.0 lanes you have available for expansion slot and NVMe storage and how many SuperSpeed USB ports 20GB/s and 10GB/s are supported.

Basically, it means having plenty of room for connectivity and planning for the future even because right now, even the high-end graphic cards are stuck to PCIe 4.0.

When I decided to go for a high-end chipset, I found it difficult to choose among the available motherboards in the market. On the one hand, the prices were high, and on the other hand, I was looking for something not specifically designed for extreme overclocking scenarios, such as gaming. Additionally, I was looking for a motherboard that matched the color of my case (spoiler: the coolest one). It was a challenging task.

The right balance between price, features, and design was the [ASUS Prime X670E-Pro](https://www.asus.com/motherboards-components/motherboards/prime/prime-x670e-pro-wifi/) board.

This board boasts a sleek design without any gaming gimmicks. It features a top-of-the-line chipset, PCIe 5 NVMe, and an expansion slot. Additionally, it includes a Realtek 2.5Gbps Ethernet and wifi, as well as several high-speed USB ports. Additionally, it perfectly matches the white color of the case I chose (the coolest part of this build in the following sections).

### CPU and Cooling system

I wanted horsepower here, so I opted for one of the high-end processors available, [specifically the 7900x](https://amzn.to/3nNQFAu), 12 cores, and 24 threads up to 5.6GHz with a default TDP of 170W, a beast, no more to add here.

Then it was time to choose the cooling system; I wanted something simple, ultra-silent, and simple to mount, so I opted for the best-in-class CPU cooler, a beast made of metal  + 2 ultra-silent 140mm fans.

- [Noctua NH-D15 chromax.Black](https://amzn.to/3VN4cos)
- [Noctua NA-HC4 chromax.White, Heatsink Cover](https://amzn.to/3NJyK8z)

I also found interesting this video of Linus, a bit older now, but I guess still valid, even tho modern CPUs, especially the new gen, tend to become very hot.

[https://youtu.be/1YFR20MmvpM](https://youtu.be/1YFR20MmvpM)

### Power supply

The most interesting (and unexpected) part of choosing the power supply is that I learned about the existence of an official rating system, [the 80 Plus](https://en.wikipedia.org/wiki/80_Plus).

{{< notice tip >}}

**AI GENERATED**

The 80 Plus rating is an energy efficiency rating system for power supplies. It measures the percentage of input power converted into usable output power, with higher ratings indicating higher efficiency. The rating system includes the following levels: 80 Plus, 80 Plus Bronze, 80 Plus Silver, 80 Plus Gold, 80 Plus Platinum, and 80 Plus Titanium.

{{< /notice >}}

So I opted out here for [EVGA Supernova 650 P6, 80 Plus Platinum 650W, Fully Modular, Eco Mode](https://amzn.to/44DhMhV); why? The answer is in the name:

- 650W Platinum: enough energy room for this use case and very efficient.
- Fully Modular: simpler and cleaner cable management.
- Eco mode: automatically powers off the fan when not needed, it means silence.

### RAM and SSD

The RAM was quite simple; once I found the existence of QVL, never heard about it.

- QVL stands for Qualified Vendor List. It applies to each motherboard and is put out by the manufacturer (Asus, MSI, etc). Basically, this is a list of hardware that the manufacturer has specifically tested and knows will work with that motherboard. This usually includes hardware like RAM, CPUs, SSDs, etc. But RAM is what’s important to this discussion.

So, I used the [QVL list of the motherboard](https://www.asus.com/it/motherboards-components/motherboards/prime/prime-x670e-pro-wifi/helpdesk_qvl_memory/?model2Name=PRIME-X670E-PRO-WIFI), and I opted for [2x32GB Kingston Fury sticks](https://amzn.to/44PbE6p), not ECC, even though the system is working stable as a rock. But this is a point I want to come back to in the future.

Then it was the time for the storage; I found that no consumer SSD PCIe 5.0 drives exist at a sane price, [they are moving the first steps now](https://arstechnica.com/gadgets/2023/03/first-wave-of-pcie-5-0-ssds-arrives-with-high-prices-and-ridiculous-heatsinks/), and as always, the starting price is for enthusiasts.

So I chose a [Samsung 980 PRO](https://amzn.to/3HJYUEg), stable and rock solid - [remember to update](https://www.tomshardware.com/news/samsung-980-pro-ssd-failures-firmware-update) its firmware to the latest version; lately, a big batch of devices have suffered from faulty firmware causing the SSD to die.

### Case

I kept this chapter for last to emphasize the part that convinced me to carry out this PC build.

I have always loved Scandinavian design's minimalistic and practical approach, often using wood.

Then I saw this picture. Isn't it stunningly beautiful? Many have dreamed about making a computer case from real wood at least once, isn’t it?

![Fractal north case](/images/posts/6-linux-workstation/fractal-north-case.webp)

And found that was an actual recently released product from Fractal: [https://www.fractal-design.com/products/cases/north/north/chalk-white/](https://www.fractal-design.com/products/cases/north/north/chalk-white/)

There are 4 variants, black or white, glass or mesh side panel; I opted for the [white one with the tempered glass](https://amzn.to/3NMrfgU).

I love it! It's nice and solid, with plenty of room for drives and cables, 2 big silent fans hidden behind the wood, and a bunch of inputs (1xUSB 3.1 Gen 2 Type-C, 2xUSB 3.0, Audio & Mic) on the front interface.

## Conclusion

Building a Linux workstation from scratch **is a fun and rewarding experience**, but it can also be a daunting task. This guide provides a detailed overview of the hardware and software required to build the perfect Linux workstation. The requirements and specifications listed here are just a starting point, as every user's needs and preferences will be unique.

When choosing hardware components, it's important to consider factors such as Linux compatibility, power efficiency, and expandability. The AMD AM5 platform with Zen4 CPU architecture is a great choice for a high-performance workstation that can meet your needs both now and in the future.

In addition to the hardware, it's important to choose software that is compatible with Linux and meets your needs.

Overall, building a Linux workstation is a fun and rewarding experience that can help you unleash your creativity and productivity. Whether you're a developer, designer, or power user, building your own workstation can help you achieve your goals and take your work to the next level.

That's it and i hope you've enjoed it!

If I am missing something big or you want to discuss it, as always, drop me a message on the contacts you can find [here](/about) or drop me a message on [Mastodon](https://continuousdelivery.social/@paolomainardi).
