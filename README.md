# omarchy.wwan

User-space Omarchy shell plugin: WWAN / cellular modem in the Quattro bar.

The folder is named `omarchy.wwan` for a later first-party copy. The live manifest id is **`nm.wwan`**: the shell rejects third-party ids in the reserved `omarchy.*` namespace.

| File | What |
|---|---|
| `manifest.json` `Panel.qml` `Service.qml` `Model.js` | Plugin code |
| `test-model.js` | Parser tests (`node test-model.js`) |
| [PRIOR-ART.md](PRIOR-ART.md) | What Omarchy already did (#4219, #4823, #7395) |
| [IDEA.md](IDEA.md) | Goal, constraints, this machine as the test bed |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Separate plugin, backends, UI, hide-when-absent |
| [AGENTS.md](AGENTS.md) | How to work in this folder |

## Load on this desktop

```bash
mkdir -p ~/.config/omarchy/plugins
ln -sfn /home/nm/dev/omarchy/plugins/omarchy.wwan ~/.config/omarchy/plugins/omarchy.wwan
omarchy-shell shell rescanPlugins
omarchy plugin enable nm.wwan
```

Or add `{ "id": "nm.wwan" }` to `bar.layout.right` in `~/.config/omarchy/shell.json`.

Saves under `~/.config/omarchy/plugins/` hot-reload. Force: `omarchy-shell shell rescanPlugins`.

Validate:

```bash
omarchy plugin validate /home/nm/dev/omarchy/plugins/omarchy.wwan
```

Do not edit `/usr/share/omarchy` or land WWAN inside `omarchy.network`.
