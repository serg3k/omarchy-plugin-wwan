# omarchy.wwan — developer spec

User-facing install and usage: [README.md](README.md).

User-space Omarchy shell plugin: WWAN / cellular modem in the Quattro bar.

The folder is named `omarchy.wwan` for a later first-party copy. The live manifest id is **`nm.wwan`**: the shell rejects third-party ids in the reserved `omarchy.*` namespace.

| File | What |
|---|---|
| [README.md](README.md) | End-user install and usage |
| `manifest.json` `Panel.qml` `Service.qml` `Model.js` | Plugin code |
| `test-model.js` | Parser tests (`node test-model.js`) |

`AGENTS.md`, `IDEA.md`, `ARCHITECTURE.md`, and `PRIOR-ART.md` stay on this machine for agents. They are gitignored and not in the published repo.

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
