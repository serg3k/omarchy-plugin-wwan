# omarchy-plugin-wwan — developer spec

User-facing install and usage: [README.md](README.md).

User-space Omarchy shell plugin: WWAN / cellular modem in the Quattro bar.

The git repo and this folder stay **`omarchy-plugin-wwan`**. The live manifest id is **`io.github.serg3k.omarchy-plugin-wwan`**. That is not the reserved `omarchy.*` namespace (`omarchy.wwan` would be rejected). A later first-party copy would live at `shell/plugins/panels/wwan/` with id `omarchy.wwan`.

| File | What |
|---|---|
| [README.md](README.md) | End-user install and usage |
| `manifest.json` `Panel.qml` `Service.qml` `Model.js` | Plugin code |
| `test-model.js` | Parser tests (`node test-model.js`) |
| `preview.png` | Marketplace / README screenshot |

`AGENTS.md`, `IDEA.md`, `ARCHITECTURE.md`, and `PRIOR-ART.md` stay on this machine for agents. They are gitignored and not in the published repo.

## Load on this desktop

```bash
mkdir -p ~/.config/omarchy/plugins
ln -sfn /home/nm/dev/omarchy/plugins/omarchy-plugin-wwan ~/.config/omarchy/plugins/io.github.serg3k.omarchy-plugin-wwan
omarchy-shell shell rescanPlugins
omarchy plugin enable io.github.serg3k.omarchy-plugin-wwan
```

Or add `{ "id": "io.github.serg3k.omarchy-plugin-wwan" }` to `bar.layout.right` in `~/.config/omarchy/shell.json`.

Saves under `~/.config/omarchy/plugins/` hot-reload. Force: `omarchy-shell shell rescanPlugins`.

Validate:

```bash
omarchy plugin validate /home/nm/dev/omarchy/plugins/omarchy-plugin-wwan
```

Do not edit `/usr/share/omarchy` or land WWAN inside `omarchy.network`.
