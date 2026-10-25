+++
date = "2026-10-26T00:01:00+01:00"
title = "How I manage my dotfiles with yadm"
description = "Six years and more than a thousand commits of dotfiles in one git repository, kept with yadm, a tool that is just git with your home directory as the work tree."
slug = "manage-dotfiles-with-yadm"
tags = ["linux", "dotfiles", "yadm", "git"]
series = "workstation"
series_part = 1
featuredImage = "/images/posts/16-yadm/dotfiles-home-threads.webp"
images = ["/images/posts/16-yadm/dotfiles-home-threads.webp"]
draft = "false"
+++

## TL;DR

I keep every configuration file of my Linux machines, and of my Mac, in one git repository managed with **[yadm](https://yadm.io/)**. yadm is a thin wrapper around git that uses your home directory as the work tree, so there is nothing new to learn: `yadm add`, `yadm commit`, `yadm push`. The repository started on July 24, 2020, and today it holds 349 files and 1,154 commits.

## Introduction

For many years after university I did not have much to manage. One MacBook, not even an external monitor, and that was my whole setup.

That changed with the pandemic. I started to invest in my local setup, I finally built a [Linux workstation](/posts/linux-workstation-build/) again, and I got a ThinkPad X1 Carbon, which I also used at work, mostly to test development environments. Two Linux machines and a Mac to keep in step.

So the goal was simple: a tool to keep them in sync, simple, and ideally based on git. This is where I found yadm.

This post is the first of a series, one a week, on how I manage my Linux workstations: dotfiles, window managers, packages, the bar, the shell, and the agents that now do a good part of the work.

## What yadm is

yadm stands for _Yet Another Dotfiles Manager_. It is basically a wrapper around git: the repository lives in `~/.local/share/yadm/repo.git`, and the work tree is your home directory. Every git command works, prefixed with `yadm` instead of `git`:

```bash
yadm status
yadm add ~/.config/waybar/modules.json
yadm commit -m "feat(waybar): add the weather module"
yadm push
```

That is it. I do not need to learn anything new, and I love it for that. On a new machine it is `yadm clone`, and the files land where they belong.

On top of plain git, yadm adds three things, each with a post of its own later in this series:

- **Alternates**: a file can have a variant per operating system or per machine, and yadm links the right one. My Waybar layout is `config.local##o.Linux,h.<hostname>`, one file per machine, and each machine sees only its own as `config.local`.
- **Encryption**: the files matched by the patterns in `~/.config/yadm/encrypt` go into one encrypted archive. `yadm encrypt` builds it, `yadm decrypt` restores the files on a new machine.
- **Bootstrap**: `~/.config/yadm/bootstrap`, an executable that `yadm bootstrap` runs after the clone. Mine starts the login services, configures GPG and sets up zsh.

## How it works day to day

There is no grand process. My changes are all over the place: any tool that has a dotfile worth sharing, I `yadm add` it. A new waybar module, a keybinding, a script in `~/.local/bin`, a udev rule: it goes in, it gets committed, it gets pushed.

Yes, sometimes I forget to add a file, or to pull before I start, or to push when I am done. But hey, that is me, not the tool.

After six years, the repository looks like this:

- **349 files**, the largest groups being my scripts in `~/.local/bin`, then the Waybar, Hyprland and sway configurations, agent skills and keyboard layouts.
- **1,154 commits**, and the pace keeps growing:

{{< chart type="bar" data="commits-per-year.csv" y="year" x="commits" highlight="2026" axis="Commits to the dotfiles per year, 2026 until October" >}}
Commits per year. 2026 is not over yet and it is already the busiest year, for a reason that comes at the end of this post.
{{< /chart >}}

## Where I draw the line

Not everything belongs in the repository. Secrets are almost entirely out of it. I still keep a few files there for convenience, because yadm can encrypt them, but today I prefer a proper secret manager.

Keeping encrypted secrets in a repository is always a risk: someone can copy them now and decrypt them later, once quantum computers make that practical. It even has a name: [harvest now, decrypt later](https://en.wikipedia.org/wiki/Harvest_now,_decrypt_later). More on this in the post about secrets.

## The agents commit too

The busiest year has a reason: AI agents now work on my dotfiles too, and they commit through yadm like I do.

Since May 2026 every commit an agent makes carries an `Assisted-by` trailer, a convention from the [SparkFabrik agents harness](https://github.com/sparkfabrik/sf-agents-harness/tree/main/skills/system/sf-commit-convention): whenever an agent does something for us, it says so. That makes it easy to count. The first trailer appears on May 3, 2026, and since then **217 of 272 commits**, about 80%, carry one. The pace went from about 25 commits a month to about 45.

How the agents work on a home directory, and what they need to know about it, is the last post of the series.

## Conclusion

yadm is just a git repository. If you need something super simple to keep your dotfiles, this tool is the right choice.

Next week: one repository, several machines, and how yadm alternates give each of them its own version of a file.

If you have questions or just want to talk about dotfiles, just drop me a message [here](https://github.com/paolomainardi/paolomainardi.com/discussions).
