---
title: "Tackling Bluetooth Mouse Lag on Linux"
date: 2025-05-11
tags: [linux, bluetooth, performance, how-to, mouse, trackpad, debugfs, script]
description: "Use a configurable shell script to adjust Bluetooth LE parameters via debugfs for a smoother cursor, eliminating stutter."
---

## Introduction

If you're experiencing **annoying lag or stutter** with your Bluetooth mouse or trackpad on Linux, this post might help you fix it.

This approach works by directly adjusting **Bluetooth connection parameters** through the `debugfs` interface.

I was seeing serious **stutters** with my **MX Master 3S**, especially under heavy load. It became almost unusable. I also had similar problems with an **Apple Magic Trackpad 2**. The trackpad performs well on Linux and Sway _(yes, even gestures)_, but it was stuttering a lot, which made it impossible to use.

After applying these changes, the situation has improved significantly:

- The **trackpad** now works perfectly.
- The **MX Master 3S** still stutters occasionally, but it's acceptable.

I use the MX Master over Bluetooth instead of its USB receiver because **hi-res scrolling** is only supported via Bluetooth. I rely on this feature daily. Unfortunately, support for hi-res scrolling through the receiver doesn't appear to be coming soon:
[https://gitlab.freedesktop.org/libinput/libinput/-/issues/996](https://gitlab.freedesktop.org/libinput/libinput/-/issues/996)

There’s also a relevant reference on the Arch Linux Wiki:
[https://wiki.archlinux.org/title/Bluetooth_mouse#Mouse_lag](https://wiki.archlinux.org/title/Bluetooth_mouse#Mouse_lag)

{{< notice note >}}
**Note:** I haven't gone deep into the technical details of this issue. Bluetooth stuttering is complex and involves the kernel, the Bluetooth stack, radio signals, device firmware, and more. If this solution doesn't work for you or if you have a better one, feel free to share your input in the [discussions](https://github.com/paolomainardi/paolomainardi.com/discussions).
{{< /notice >}}

## Why the cursor stutters

**Bluetooth Low Energy (LE) devices**, which include most modern mice and trackpads, are designed with power efficiency in mind. To save battery, they negotiate certain connection parameters with your computer (the host) each time they connect. The primary parameters affecting responsiveness are:

| Parameter              | Meaning                                                           | Desired "Snappy" Value (Script Default) |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| **min / max interval** | How frequently the host and device communicate (1 unit = 1.25 ms) | 6–7 (translates to 7.5-8.75 ms)         |
| **latency**            | Number of communication events the device is allowed to skip      | 0                                       |

Many mice will request higher interval values or a non-zero latency to conserve power. Some might also enter low-power "Sniff Modes." When this happens, your cursor can appear to freeze momentarily or stutter because the device is waiting for its next scheduled slot to communicate with the host. This script aims to force these parameters into a low-latency configuration.

## The Solution: A Script to Tweak `debugfs`

The Linux kernel often exposes detailed Bluetooth adapter settings via its `debugfs` filesystem. By writing specific values to certain files within this system, we can influence the connection parameters for our Bluetooth devices.

Here is a shell script designed to apply these low-latency settings:

```bash
#!/bin/bash

# These values determine the desired Bluetooth connection parameters.
# Adjust them here if needed, then test.

# Bluetooth connection latency.
# '0' means the peripheral (mouse/trackpad) should not skip any connection events.
# This is crucial for minimizing perceived lag.
# Default: 0
TARGET_CONN_LATENCY=0

# Bluetooth minimum connection interval.
# Value is in units of 1.25ms (e.g., 6 * 1.25ms = 7.5ms).
# Lower values mean more frequent communication, reducing lag.
# Default: 6
TARGET_CONN_MIN_INTERVAL=6

# Bluetooth maximum connection interval.
# Value is in units of 1.25ms (e.g., 7 * 1.25ms = 8.75ms).
# For low latency, this is typically set equal to or slightly larger than TARGET_CONN_MIN_INTERVAL.
# Default: 7
TARGET_CONN_MAX_INTERVAL=7

# Wait briefly for interfaces to initialize and debugfs files to appear.
sleep 3

BT_DEBUG_PATH="/sys/kernel/debug/bluetooth/"

if [ ! -d "$BT_DEBUG_PATH" ]; then
    logger "Bluetooth debugfs path $BT_DEBUG_PATH not found. Kernel may need CONFIG_BT_DBUGFS."
    exit 1
fi

for HCI_PATH in ${BT_DEBUG_PATH}hci*/ ; do
    if [ -d "$HCI_PATH" ]; then
        HCI_DEVICE=$(basename "$HCI_PATH")

        CONN_LATENCY_FILE="${HCI_PATH}conn_latency"
        CONN_MIN_INTERVAL_FILE="${HCI_PATH}conn_min_interval"
        CONN_MAX_INTERVAL_FILE="${HCI_PATH}conn_max_interval"

        logger "Attempting to configure low-latency Bluetooth parameters for $HCI_DEVICE using values: Latency=${TARGET_CONN_LATENCY}, MinInterval=${TARGET_CONN_MIN_INTERVAL}, MaxInterval=${TARGET_CONN_MAX_INTERVAL}"

        # Apply conn_latency setting
        if [ -f "$CONN_LATENCY_FILE" ]; then
            if echo "${TARGET_CONN_LATENCY}" > "$CONN_LATENCY_FILE"; then
                logger "Set conn_latency to ${TARGET_CONN_LATENCY} for $HCI_DEVICE"
            else
                logger "Error setting conn_latency for $HCI_DEVICE"
            fi
        else
            logger "conn_latency file not found for $HCI_DEVICE"
        fi

        # Apply conn_min_interval setting
        if [ -f "$CONN_MIN_INTERVAL_FILE" ]; then
            if echo "${TARGET_CONN_MIN_INTERVAL}" > "$CONN_MIN_INTERVAL_FILE"; then
                logger "Set conn_min_interval to ${TARGET_CONN_MIN_INTERVAL} (raw value) for $HCI_DEVICE"
            else
                logger "Error setting conn_min_interval for $HCI_DEVICE"
            fi
        else
            logger "conn_min_interval file not found for $HCI_DEVICE"
        fi

        # Apply conn_max_interval setting
        if [ -f "$CONN_MAX_INTERVAL_FILE" ]; then
            if echo "${TARGET_CONN_MAX_INTERVAL}" > "$CONN_MAX_INTERVAL_FILE"; then
                logger "Set conn_max_interval to ${TARGET_CONN_MAX_INTERVAL} (raw value) for $HCI_DEVICE"
            else
                logger "Error setting conn_max_interval for $HCI_DEVICE"
            fi
        else
            logger "conn_max_interval file not found for $HCI_DEVICE"
        fi
    fi
done

exit 0
```

### How the Script Works

{{< notice tip >}}
Thanks to Gemini for the following paragraph, which explains the script in detail.
{{< /notice >}}

1. **Configuration Section**: At the top, `TARGET_CONN_LATENCY`, `TARGET_CONN_MIN_INTERVAL`, and `TARGET_CONN_MAX_INTERVAL` are defined. These are the values the script will attempt to set.
2. **`sleep 3`**: The script waits for 3 seconds. This gives Bluetooth interfaces time to initialize properly, especially if the script is run early during boot or upon device detection.
3. **`BT_DEBUG_PATH`**: Defines the standard location for Bluetooth `debugfs` entries. It checks if this path exists; if not, it logs an error and exits.
4. **Looping through Adapters**: It iterates over all detected Bluetooth Host Controller Interfaces (e.g., `hci0`, `hci1`).
5. **Parameter Adjustment**:
   - **`conn_latency` set to the target value (default `0`)**: This tells the peripheral device (your mouse) how many connection events it can skip. `0` means it should not skip any, aiming for the most immediate communication, which is crucial for minimizing perceived lag.
   - **`conn_min_interval` set to the target value (default `6`)**: This sets the minimum desired connection interval (e.g., $6 \times 1.25\text{ms} = 7.5\text{ms}$).
   - **`conn_max_interval` set to the target value (default `7`)**: This sets the maximum desired connection interval (e.g., $7 \times 1.25\text{ms} = 8.75\text{ms}$).
     By forcing a very short and tight range for the connection interval and disallowing skipped events, the script encourages your mouse and computer to communicate very frequently and without deliberate pauses.
6. **Logging**: `logger` commands send output to the system journal, which helps in verifying the script's execution and troubleshooting.

## Automating with udev

To apply these settings automatically every time your Bluetooth adapter is initialized, you can use a `udev` rule.

- **Save** the script above to a file in a system-wide accessible location. **Do NOT use your user's home directory for scripts run by udev.** A good choice is `/usr/local/bin/set_bluetooth_latency.sh`.

  ```bash
  sudo vi /usr/local/bin/set_bluetooth_latency.sh
  # Paste the script content here, then save and exit.
  ```

- **Make** it executable:

  ```bash
  sudo chmod +x /usr/local/bin/set_bluetooth_latency.sh
  ```

- **Create** a new `udev` rule file, e.g., `/etc/udev/rules.d/99-bluetooth-low-latency.rules`:

  ```udev
  ACTION=="add", SUBSYSTEM=="bluetooth", KERNEL=="hci[0-9]*", RUN+="/usr/local/bin/set_bluetooth_latency.sh"
  ```

- **Reload** the `udev` rules and trigger them:

  ```bash
  sudo udevadm control --reload-rules && sudo udevadm trigger
  ```

This rule will execute your script whenever a Bluetooth `hci` device is added to the system.

## Expected Results & Verification

After the script runs (either manually or via `udev`), re-pair your devices, I hope it will fix the stutters even for you.

There are a few ways to verify the changes:

1. **Directly Check `debugfs` Default Values:**
   This is the most direct way to see if the script has set the adapter's preferred parameters. After the script has executed, inspect the values written to the `debugfs` files for your Bluetooth adapter (e.g., `hci0`). Open a terminal and use `cat`:

   ```bash
   cat /sys/kernel/debug/bluetooth/hci0/conn_latency
   cat /sys/kernel/debug/bluetooth/hci0/conn_min_interval
   cat /sys/kernel/debug/bluetooth/hci0/conn_max_interval
   ```

   Replace `hci0` with your actual Bluetooth adapter if it's different (e.g., `hci1`). The output values should match the `TARGET_CONN_LATENCY`, `TARGET_CONN_MIN_INTERVAL`, and `TARGET_CONN_MAX_INTERVAL` variables defined at the top of the script.

2. **Monitor Live Connection Parameters with `btmon`:**
   To see the parameters actually negotiated during an active connection with your mouse, use `btmon`:

   ```bash
   sudo btmon
   ```

   Connect your Bluetooth mouse. Look for "Connection Update Complete" events or similar messages (sometimes `LE Connection Update Complete`). These events should show the `Interval` and `Slave Latency` (or `connLatency`). Ideally, these will be at or very close to the values the script aimed for (e.g., Interval around 7.5ms - raw `0x0006` - or 8.75ms - raw `0x0007`, and Latency `0` - raw `0x0000`).

## Important Notes

- **Kernel Support**: Your kernel needs to be compiled with `CONFIG_BT_DBUGFS=y` for the `/sys/kernel/debug/bluetooth` path and its files to be available. Most modern distribution kernels have this enabled.
- **Permissions**: Writing to `debugfs` typically requires root privileges, which is why the script would be run via `sudo` or by `udev` (which runs with root privileges).
- **Re-pairing**: In some cases, you might need to un-pair and then re-pair your Bluetooth mouse for the new connection parameters to take full effect.
