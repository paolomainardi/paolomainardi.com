+++
date = "2022-09-11"
title = "How to open apps with keyboard shortcuts on macOS with skhd"
slug = "hello-world"
tags = ["linux", "macos", "tiling-managers"]
categories = []
draft = "false"
featuredImage = "https://i.redd.it/z7gqo65ifqt71.png"
images = ["https://i.redd.it/z7gqo65ifqt71.png"]
+++

What I've always loved about **Linux** is its **customizability** and the **freedom** you have to configure your [rice][1] exactly you like it, especially when you pass the line of **D**esktop **E**nvironments to embrace more straightforward environments like [tiling manager][2]; this is where [Linux on the desktop shines][3].

**Tiling managers** allow **arranging windows** in non-overlapping **frames** and controlling any aspect using the **keyboard**, including opening, closing, moving, and resizing.

Like the most known desktop environments (including **macOS**), they also have the concept of **workspaces**, where you can organize your windows in a way you feel more productive.

In order of preference, the things I love about this workflow:

1.  Opening a terminal with **Super+Enter**
2.  Opening a new browser instance with **Super+Shift+Enter**
3.  Move a window in another workspace with **Super+Shift+\[1,n\]**
4.  Resize the windows (well, its frame) with **Super+r** plus the arrows

Now, **approaching to the core of this article**, **I use** both **Linux and macOS** daily, and I **share** most of the **dotfiles** between the systems (_i use_ [_yadm_][4]); everything works very well except the desktop workflow and the keyboard shortcuts that i cannot easily share.

### Tiling window managers on macOS ?

**macOS** **doesn't have a native windows tiling management** (well, there is one, but very limited to full-screen apps). Some open-source projects aim to fix that, like [Amethyst][5] or [Yabai][6]; I am currently using the **first one**, which is quite ok for casual usage but **very limited** for the most advanced scenarios; in that case, consider Yabai, which requires a **most complex installation** to take deeper control of the operating system part in charge of window management.

**Another significant** missing **is there isn't a simple way on macOS** to have a **shortcut** to spin up a new application (like a new terminal window) or a new instance of the already open program.

To do that, you must use a combination of stuff like **Automator** and **keyboard shortcuts** with many limitations on the usable keys; for example, it's impossible to use **Super+Enter** as a shortcut combination.

**It is frustrating** but **easily fixable** using a **small and ingenious** system **daemon** called [skhd][7].

### What is skhd ?

> **skhd** is a simple hotkey daemon for macOS that focuses on responsiveness and performance. Hotkeys are defined in a text file through a simple DSL. **skhd** is able to hotload its config file, meaning that hotkeys can be edited and updated live while **skhd** is running.

### How to use it?

Once installed brew and started the launchd service:

```shell
brew install koekeishiya/formulae/skhd
brew services start skhd
```

You need to create a configuration file in one of the following locations (in order of preference):

```shell
- $XDG_CONFIG_HOME/skhd/skhdrc
- $HOME/.config/skhd/skhdrc
- $HOME/.skhdrc
```

And start adding your keyboard shortcuts, for now i have just 2:

```shell {linenos=inline}
# (taken from here: https://git.arul.io/arul/dotfiles/src/branch/macOS/skhd/.config/skhd/skhdrc)

cmd - return : osascript -e 'tell application "iTerm2" to create window with default profile command ""' || open -na iTerm

# open chrome

# (taken from here: https://gist.github.com/armand1m/4094b37d8969fd365fdcc215277e9e67)

cmd + shift - return : open -n -a "Google Chrome"

```

**With those two lines**, I've finally managed to have the **same shortcuts for both systems** and fix **something I've always felt very clunky** on **macOS**.

[1]: https://thatnixguy.github.io/posts/ricing/#:~:text=The%20term%20'rice'%20is%20used,system%20becomes%20much%20more%20involved.
[2]: https://en.wikipedia.org/wiki/Tiling_window_manager
[3]: https://www.reddit.com/r/unixporn/
[4]: https://yadm.io/
[5]: https://ianyh.com/amethyst/
[6]: https://github.com/koekeishiya/yabai
[7]: https://github.com/koekeishiya/skhd

```

```
