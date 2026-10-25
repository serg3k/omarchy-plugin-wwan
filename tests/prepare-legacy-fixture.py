#!/usr/bin/env python3
"""Copy an official older shell tree for use with a newer Qt runtime.

Qt added a Color type that shadows the old shell's Commons.Color singleton.
Only qualify those references in a disposable copy. Component APIs are intact.
Usage: python3 tests/prepare-legacy-fixture.py /path/to/old/shell /tmp/fixture
Then: BATTERY_CARE_TEST_SHELL=/tmp/fixture bash tests/run-qml.sh
"""
from pathlib import Path
import re
import shutil
import sys

source, destination = map(Path, sys.argv[1:])
if not (source / 'Commons/qmldir').is_file() or not (source / 'Ui/qmldir').is_file():
    raise SystemExit('Source must be an Omarchy shell directory')
if destination.exists():
    raise SystemExit('Destination must not exist')
shutil.copytree(source, destination)
for path in destination.rglob('*.qml'):
    text = path.read_text()
    if 'Color.' not in text or path.name == 'Color.qml':
        continue
    if 'import qs.Commons\n' in text:
        text = text.replace('import qs.Commons\n', 'import qs.Commons\nimport qs.Commons as CompatCommons\n')
    elif path.parent.name == 'Commons':
        text = text.replace('import QtQuick\n', 'import QtQuick\nimport qs.Commons as CompatCommons\n')
    else:
        continue
    path.write_text(re.sub(r'(?<![\w.])Color\.', 'CompatCommons.Color.', text))
