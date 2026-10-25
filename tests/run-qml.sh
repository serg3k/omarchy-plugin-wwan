#!/usr/bin/env bash
# All modem/network commands are replaced by local read-only fixtures.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture_dir=$(mktemp -d /tmp/wwan-i18n-qml.XXXXXX)
trap 'rm -rf -- "$fixture_dir"' EXIT
shell_source=${PLUGIN_TEST_SHELL:-/usr/share/omarchy/shell}
ln -s "$root" "$fixture_dir/Plugin"
ln -s "$shell_source/Commons" "$fixture_dir/Commons"
ln -s "$shell_source/Ui" "$fixture_dir/Ui"
cp "$root/tests/qml-ui.qml" "$fixture_dir/test.qml"
mkdir -p "$fixture_dir/config/omarchy" "$fixture_dir/bin"
cat > "$fixture_dir/bin/mmcli" <<'STUB'
#!/bin/sh
[ "$LC_ALL" = C ] || exit 66
case "$*" in
  '-L') echo '/org/freedesktop/ModemManager1/Modem/0 [Mock] Modem' ;;
  '-m any --output-keyvalue')
    echo 'modem.generic.state : connected'
    echo 'modem.3gpp.operator-name : Mock Mobile'
    echo 'modem.generic.signal-quality.value : 65'
    echo 'modem.generic.access-technologies.value[1] : lte'
    ;;
  *) exit 97 ;;
esac
STUB
cat > "$fixture_dir/bin/nmcli" <<'STUB'
#!/bin/sh
[ "$LC_ALL" = C ] || exit 66
case "$*" in
  '-t -f DEVICE,TYPE,STATE,CONNECTION device') echo 'mock0:gsm:connected:Mock profile' ;;
  '-t -f NAME,TYPE,DEVICE,STATE connection show') echo 'Mock profile:gsm:mock0:activated' ;;
  *) exit 97 ;;
esac
STUB
cat > "$fixture_dir/bin/ip" <<'STUB'
#!/bin/sh
[ "$LC_ALL" = C ] || exit 66
[ "$*" = 'route get 1.1.1.1' ] || exit 97
echo '1.1.1.1 dev mock0'
STUB
chmod 700 "$fixture_dir/bin/"*
PATH="$fixture_dir/bin:$PATH" LC_ALL=de_AT.UTF-8 LC_MESSAGES=fr_FR.UTF-8 LANG=es_ES.UTF-8 XDG_CONFIG_HOME="$fixture_dir/config" XDG_STATE_HOME="$fixture_dir/state" QT_QPA_PLATFORM=wayland timeout 15 qs -p "$fixture_dir/test.qml" --no-color >"$fixture_dir/test.log" 2>&1 || {
  cat "$fixture_dir/test.log"; exit 1;
}
if rg -q 'FAIL:|TypeError|ReferenceError|Failed to load configuration' "$fixture_dir/test.log" || ! rg -q 'PASS:' "$fixture_dir/test.log"; then
  cat "$fixture_dir/test.log"; exit 1
fi
rg 'PASS:' "$fixture_dir/test.log"
