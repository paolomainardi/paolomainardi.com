+++
date = "2026-11-02T00:01:00+01:00"
title = "How I use one dotfiles repo across several machines"
description = "One yadm repository for a Mac and four Linux machines: alternates for the files that differ, and the app's own includes when it has them."
slug = "one-dotfiles-repo-several-machines"
tags = ["linux", "macos", "dotfiles", "yadm", "git"]
series = "workstation"
series_part = 2
draft = "false"
+++

## TL;DR

One **[yadm](https://yadm.io/)** repository holds the configuration of my Mac and of four Linux machines. Most files are identical everywhere. When one is not, yadm **[alternates](https://yadm.io/docs/alternates)** keep a version of it per operating system or per host, and yadm links the right one. When the application can include files on its own, as **Hyprland** does, I use that instead.

## Introduction

I need at least two kinds of machine. A **Mac**, because at [SparkFabrik](https://www.sparkfabrik.com/) it has been our standard working machine for some years now, for reasons that deserve a post of their own. And **Linux**, because it is our development stack, even on macOS through containers, and the stack of our platform team.

So I used my own fleet as a lab, to understand how much configuration we can share between the two operating systems. Today what I learned lives in **[sparkdock](https://github.com/sparkfabrik/sparkdock)**, which holds most of our common configuration, and in the Linux provisioners that build on it, such as the **[Arch Linux Ansible provisioner](https://github.com/sparkfabrik/archlinux-ansible-provisioner)**.

The fleet today is a Mac and four Linux machines:

- **paolo-cto-arch-wood** and **paolo-cto-arch-p620**, two desktops;
- **paolo-cto-arch-x1**, a ThinkPad X1 Carbon;
- **paolo-cto-framework-12**, a Framework Laptop 12 with a touch screen.

Everything I use every day goes in the same repository, from the terminal and its tools to desktop apps such as **Chrome** and **VS Code**. I never had to give up on sharing a configuration.

## Alternates

An alternate is a file whose name ends with `##` and a condition. yadm checks the conditions on every machine and links the file that matches to the plain name, without the suffix.

```text
.gnupg/gpg-agent.conf##os.Darwin
.gnupg/gpg-agent.conf##os.Linux
```

On my Mac, `~/.gnupg/gpg-agent.conf` is a link to the first file, on Linux to the second. The two differ in one line, the program that asks for the passphrase:

```text
pinentry-program /opt/homebrew/bin/pinentry-mac   # macOS
pinentry-program /usr/bin/pinentry-gnome3         # Linux
```

A condition can be the operating system (`os` or `o`), the hostname (`h`), and a few more such as the distribution or the CPU architecture. They combine with a comma, so `##o.Linux,h.paolo-cto-framework-12` matches one machine only. `##default` is the fallback when nothing else matches.

The repository has **22** alternates today, out of **349** files.

## The local file

Most of my alternates are not a whole configuration. The shared file stays the same everywhere and includes a small **local file**, and only the local file has a version per host.

The **Waybar** entry point is an example:

```jsonc
{
    "layer": "top",
    "position": "top",
    "height": 38,

    "include": [
        "$HOME/.config/waybar/modules.json",
        "$HOME/.config/waybar/config.local"
    ]
}
```

The modules are defined once, in `modules.json`. `config.local` holds only the layout, which modules go where, and it is an alternate. The Framework 12 has touch buttons for its tablet mode, the desktops do not.

**Alacritty** works the same way, with the font size in `alacritty.local.toml`, 16 by default and 13 on the small, high density screen of the Framework 12.

### When the local value did not apply

I wanted to change the font size on the Framework 12, and nothing happened, even though the configuration looked valid. An agent found the reason in seconds, instead of the minutes I would have spent between man pages and searches.

Alacritty loads the importing file _after_ its imports. The size set in `alacritty.toml` was overriding the one in the local file, so the fix was to keep the size only in the local alternates.

Models today know operating systems and configuration files very well, so a valid file that does not apply is quick work for them.

## Where alternates stop

Alternates multiply with every host. Waybar has one bar with a configuration for sway and one for Hyprland, each with a local file per host, and that is **10 files** for a single bar. Every new machine adds a file in several places.

Alternates are a good way to support configurations that the software does not support natively, such as including a file chosen by host. When the software does support it, I prefer the native mechanism.

**Hyprland** is the example. Its configuration is now written in **Lua**, so it can read the hostname and load a file for that host by itself:

```lua
-- Host-specific overrides replace yadm ##h.<hostname> alternates.
local host = require("modules.host")
local host_config = os.getenv("HOME") .. "/.config/hypr/hosts/" .. host .. ".lua"
local f = io.open(host_config, "r")
if f then
    f:close()
    require("hosts." .. host)
end
```

Only two machines have a host file, and the others need nothing.

{{< notice tip "A config file that an app keeps rewriting" >}}
[Solaar](https://pwr-solaar.github.io/Solaar/), the Logitech device manager, stores my mouse settings in `~/.config/solaar/config.yaml`, together with runtime state such as `_config_cookie`, which changes on every reconnect or resume. The file was always dirty in yadm. Rather than drop it from yadm, a git **clean filter** strips those keys before git sees the file, so the settings stay versioned and Solaar keeps its state on disk. The filter only exists on Linux, so it lives in a Linux alternate of the git configuration. I also asked upstream to keep that state out of the file ([pwr-Solaar/Solaar#3319](https://github.com/pwr-Solaar/Solaar/issues/3319)).
{{< /notice >}}

## Conclusion

First, use a tool to manage your dotfiles, your future self will thank you. And if you work on macOS and Linux, share them, because the configurations are almost always identical, and when they are not, there are several techniques, yadm alternates being one.

Next week: the few secrets I still keep in the repository, and how `yadm encrypt` handles them.

If you have questions or just want to talk about dotfiles, just drop me a message [here](https://github.com/paolomainardi/paolomainardi.com/discussions).
