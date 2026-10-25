"""Catalog consistency for contributor translations."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TranslationTests(unittest.TestCase):
    def test_all_catalogs_cover_english_and_preserve_placeholders(self):
        english = json.loads((ROOT / 'i18n/en.json').read_text())
        for path in sorted((ROOT / 'i18n').glob('*.json')):
            translated = json.loads(path.read_text())
            with self.subTest(language=path.stem):
                self.assertEqual(english.keys(), translated.keys())
            for key, value in english.items():
                with self.subTest(language=path.stem, key=key):
                    self.assertIsInstance(translated[key], str)
                    self.assertTrue(translated[key].strip())
                    self.assertEqual(sorted(re.findall(r'%\d+', value)),
                                     sorted(re.findall(r'%\d+', translated[key])))
                    if key.startswith(' '):
                        self.assertTrue(translated[key].startswith(' '))

    def test_literal_translation_keys_exist(self):
        english = json.loads((ROOT / 'i18n/en.json').read_text())
        for path in list(ROOT.glob('*.qml')):
            for key in re.findall(r'(?:strings\.t|\bt)\(("(?:[^"\\]|\\.)*")(?=\s*[,\)])', path.read_text()):
                self.assertIn(json.loads(key), english, str(path))
