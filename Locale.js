// POSIX locale names -> Omarchy catalog codes. Keep paths derived from a
// validated language/region only; environment values are not file paths.
function languageCode(raw) {
  var locale = String(raw || "").trim().split(/[.@]/)[0]
  if (!locale || locale === "C" || locale === "POSIX") return "en"
  var match = /^([a-zA-Z]{2,3})(?:[_-]([a-zA-Z]{2}|[0-9]{3}))?$/.exec(locale)
  if (!match) return "en"
  var language = match[1].toLowerCase()
  var region = match[2] ? match[2].toUpperCase() : ""
  // Omarchy uses these two region codes for its Chinese catalogs.
  if (language === "zh") return region === "TW" || region === "HK" || region === "MO" ? "zh-TW" : "zh-CN"
  return language + (region ? "-" + region : "")
}
function systemLanguage(lcAll, lcMessages, lang, qtLocale) {
  return languageCode(lcAll || lcMessages || lang || qtLocale)
}
if (typeof module !== "undefined") module.exports = { languageCode, systemLanguage }
