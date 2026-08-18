# WWAN for Omarchy

Bar widget for cellular / mobile data on Omarchy 4 (Quattro). It shows signal and operator, and connects or disconnects the NetworkManager gsm profile with one switch.

The widget hides when the machine has no modem. Wi-Fi and Ethernet stay in the stock network widget.

![WWAN panel open from the bar, connected to Telekom.de on LTE](screenshot.png)

Plugin id: `omarchy-plugin-wwan`.

## Features

- Hides when no modem is present
- One switch for mobile data: unblock the WWAN radio if needed, enable the modem, bring the gsm profile up
- Bar icon tracks the NetworkManager profile, not leftover ModemManager state
- Panel shows operator, access technology, signal, profile, and a short state line
- Stays visible when Wi-Fi or Ethernet owns the default route

## Requirements

- Omarchy **4.0.0 Quattro** or later (Quickshell bar, not Waybar)
- `ModemManager` and `NetworkManager`
- A gsm / WWAN modem that already works with `mmcli` and an NM gsm profile (APN saved in NetworkManager)

This plugin does not ship FCC unlock scripts or an APN editor. Set those up with `nmtui` or your vendor unlock first.

## Install

This repo is a plugin: `manifest.json` at the root. Add it from git when you have a URL:

```bash
omarchy plugin add <git-url> --enable
```

From a local checkout:

```bash
mkdir -p ~/.config/omarchy/plugins
ln -sfn "$(pwd)" ~/.config/omarchy/plugins/omarchy-plugin-wwan
omarchy plugin validate ~/.config/omarchy/plugins/omarchy-plugin-wwan
omarchy plugin enable omarchy-plugin-wwan
```

If the icon does not appear, run `omarchy-shell shell rescanPlugins` or `omarchy restart shell`. Move it with `omarchy bar move omarchy-plugin-wwan --section right` if you want a different slot.

## Use

- **Click** the bar icon to open the panel.
- **Switch** turns mobile data on or off. On: unblock the WWAN radio if needed, enable the modem, bring the gsm profile up. Off: take the profile and bearer down; the radio stays on so the next connect is fast.
- **Right-click** the bar icon toggles the same switch. **Middle-click** refreshes status.
- There is **one** switch. rfkill, airplane mode, and ThinkPad FN are not a second control. If the radio is blocked, the same switch turns it back on as part of mobile data on.
- The bar still shows the modem when Wi-Fi owns the default route.

### Keyboard

Inside the panel:

- `t`: toggle mobile data
- `r`: refresh status
- arrows / `j` `k`: move the cursor
- enter / space: activate
- `esc`: close

### Icons

| What you did | Bar glyph |
|---|---|
| Mobile data connected | Signal wedge (more fill = stronger) |
| Profile down, radio still on | Empty wedge, dim |
| Radio off (rfkill / disabled) | Slashed signal wedge |

`sim-pin2` on a working modem is FDN, not a lock. A real PIN/PUK lock blocks the switch.

## Hardware tested

| Date | Machine | Modem | Notes |
|---|---|---|---|
| 2026-08-18 | Lenovo ThinkPad T14 Gen 6 (`21QJ00DTGE`), Omarchy 4.0.0, kernel `6.18.2-arch2-1` | Quectel **EM061K-GL** (LTE) | NM profile `v6-telekom`, operator Telekom.de, FCC unlock `2c7c:6008` already on the host |

Other laptops with a ModemManager gsm device should work the same. They are not tested in this tree. US-sold modules often need an FCC unlock symlink under `/etc/ModemManager/fcc-unlock.d/` before any UI matters.
