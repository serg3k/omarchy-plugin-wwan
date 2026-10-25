const assert = require('node:assert/strict');
const {languageCode, systemLanguage} = require('../Locale.js');
for (const [raw, expected] of [
  ['de_AT.UTF-8', 'de-AT'], ['pt_BR.UTF-8', 'pt-BR'],
  ['es_MX.UTF-8', 'es-MX'], ['fr_FR@euro', 'fr-FR'],
  ['zh_CN.UTF-8', 'zh-CN'], ['zh_HK.UTF-8', 'zh-TW'],
  ['ar_AE.UTF-8', 'ar-AE'], ['C', 'en'], ['C.UTF-8', 'en'],
  ['POSIX', 'en'], ['', 'en'], ['../../de', 'en'], ['de/AT', 'en']
]) assert.equal(languageCode(raw), expected, raw);
assert.equal(systemLanguage('de_AT.UTF-8', 'fr_FR.UTF-8', 'es_ES.UTF-8', 'en_US'), 'de-AT');
assert.equal(systemLanguage('', 'fr_FR.UTF-8', 'es_ES.UTF-8', 'en_US'), 'fr-FR');
assert.equal(systemLanguage('', '', 'es_ES.UTF-8', 'en_US'), 'es-ES');
assert.equal(systemLanguage('', '', '', 'ja_JP'), 'ja-JP');
assert.equal(systemLanguage('C', 'de_DE.UTF-8', '', ''), 'en');
console.log('18 system locale normalization and precedence checks passed');
