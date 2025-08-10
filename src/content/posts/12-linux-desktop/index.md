+++
date = "2025-08-10"
title = "Linux on Desktop is growing, but there is a big missing for a serious enterprise adoption"
slug = "linux-desktop"
tags = ["linux"]
draft = "false"
+++

Linux on Desktop is finally really growing, it has reached the [5% US market share](https://gs.statcounter.com/os-market-share/desktop/united-states-of-america) for the first time this year, this is great for several reasons and it opens the door to more opportunities for companies offering Linux services and it should be a driving force for commercial software (Adobe I am looking at you), to finally offer a Linux countepart for their software.

## Gaming

The reasons behind this growing are multiple, my take is that **gaming has been one of the driver that massively contribute** to this incredible growth, thanks to the big investments make by Valve for its products, think to [SteamOS](https://store.steampowered.com/steamos), [Proton](<https://en.wikipedia.org/wiki/Proton_(software)>) and the [Archlinux collaboration](https://lists.archlinux.org/archives/list/arch-dev-public@lists.archlinux.org/thread/RIZSKIBDSLY4S5J2E2STNP5DH4XZGJMR/), which SteamOS is based on.

> I want to mention also another super interesting Linux distribution for gaming: [Bazzite](https://bazzite.gg/) which is based on [universal-blue](https://universal-blue.org/), This is project that is shaping a new and cloud-native way to build and ship Linux distributions totally based on containers and registries, I am looking at this projects with much interest, I reccomment to take a look even to take a look at the technologies behind this.

It is becoming so mainstream on this side that even popular gaming youtubers (that I didn't and do not yet know or follow as I am not a gamer) such as [PewDiePie](https://www.youtube.com/@PewDiePie) that has 110M subscribers, just some months ago did this video [I installed Linux (so should you)](https://www.youtube.com/watch?v=pVI_smLgTY0), it is a signal that things are changing.

## Desktop and productivity

How gaming has contribute to this, is that finally users coming from other OS, in this specific case Windows, they found a that Linux today is great, it has basically everything you need from a modern OS, free of bloatware or spyware or tracking mechanisms, hardware is very well supported, desktop environments are great, **KDE** or **Gnome** reached their peak last years in terms of polishness, features and usability, even thanks to Wayland which has been one of the longest and impactful migration that Linux transitioned, sometimes very painful (I look at you yes, screen sharing), but now it finally pays back, and it is a great experience.

> There is also a very promising project worth mentioning, made by System76, called [Cosmic](https://system76.com/cosmic) which is a new Desktop Environment which combine tiling and classic window management into a very interesting unified experience, still in development but from what I can see till now is very promising, I suggest to watch [COSMIC DE - The First Modular, Composable Desktop Environment - Carl Richell & Jeremy Soller](https://www.youtube.com/watch?v=fBcfjlFX-xM&t=2206s) - at the latest Open Source Summit North America.

And for users who love to customize their experience till the last dotfile, there are notable projects like [Hypr.land](https://hypr.land) and [[Sway](https://swaywm.org/)] which pushes the boundary about how a desktop experience can be customized, to match own personal experiences by combining and creating small building blocks, just take a look at [r/unixporn](https://www.reddit.com/r/unixporn/) to get an idea about what is possible to reach.

## Omarchy and DHH

Another very recent project, at the time of writing this post, is [Omarchy](https://omarchy.org/), which is an opinionanted Arch + Hyprland setup by [David Heinemeier Hansson - DHH](https://world.hey.com/dhh), which is gaining a lot of interest from many angles, from the most nerdy stuff (_Omarchy is stunning beautiful and it is one of the most elegant setup of dotfiles and scripts I saw in years, of course they come from one of the top notch programmers of our era_) to the most business related decisions decisions, such as the migration of their entire fleet to Archlinux in the next years, [All-in on Omarchy at 37signals](https://world.hey.com/dhh/all-in-on-omarchy-at-37signals-68162450), which has been the main trigger to write this article, because it was what I dreamed for [Sparkfabrik](https://www.sparkfabrik.com) for years, but then I ditched it in favour of a **full migration to MacOS**, but let me explain it better.

## How I am using Linux today

I am still using avidly Linux on my personal devices of course and in Sparkfabrik there are still some supported (and they will be in the future of course) Linux machines, they are of course based on [Archlinux](https://github.com/sparkfabrik/archlinux-ansible-provisioner) with our automatic and ansible-based system provisioner, which is mostly related to packages and system-wide configurations instead of setting up the Desktop experience, which defaults to Gnome to cover the most general needs.

When I started this project ([2021](https://github.com/sparkfabrik/archlinux-ansible-provisioner/commit/c0d4139a82858e9d335c0b9c51d7187ed91a50e4)), projects like Hyprland was not even yet created and even Wayland support was far than usable in many DE, but I am an avid tiling manager user, so my journey has been i3 and than when things become more stable and supported in the Wayland space, I've migrated to Sway, which I am using as my daily driver since at least 2.5 years.

![images/12-linux-desktop](/images/posts/12-linux-desktop/linux-desktop.webp)

It is nothing too fancy in terms of theming or features, but it works perfectly for my needs and it is opens the door to having fun and loosing a lot of time trying to customize things just for the sake of experimenting, sometimes can be a trap, it looks like a never ending game, even pushed the rolling of packages from Archlinux, which are basically constant.

## Why I chose MacOS as the main driver for my company

## Pain points

### Remote management and firmware

### Accessibility
