import QtQuick
import Quickshell
import Quickshell.Io
import "Locale.js" as LocaleModel

// Omarchy 4.5+ owns language selection. On older shells, use the process's
// POSIX message locale. There is no dependency on Commons.I18n at load time.
Item {
  id: root
  property var directory: Qt.resolvedUrl("i18n")
  property var nativeTranslator: null
  property var nativeComponent: null
  readonly property bool nativeAvailable: nativeTranslator !== null
  readonly property string systemLanguage: LocaleModel.systemLanguage(
    Quickshell.env("LC_ALL"), Quickshell.env("LC_MESSAGES"),
    Quickshell.env("LANG"), Qt.locale().name)
  readonly property string language: nativeAvailable ? nativeTranslator.language : systemLanguage
  readonly property string baseLanguage: language.split("-")[0]
  readonly property bool rightToLeft: nativeAvailable ? nativeTranslator.rightToLeft : ["ar", "he", "fa", "ur"].indexOf(baseLanguage) >= 0
  readonly property string directoryPath: String(directory).replace(/^file:\/\//, "").replace(/\/+$/, "")
  property var englishStrings: ({})
  property var baseStrings: ({})
  property var languageStrings: ({})

  function parse(raw) {
    try {
      var data = JSON.parse(raw || "{}")
      return data && typeof data === "object" && !Array.isArray(data) ? data : ({})
    } catch (error) { return ({}) }
  }
  function t(key, fallback) {
    if (nativeAvailable) return nativeTranslator.t(key, fallback)
    var layers = [languageStrings, baseStrings, englishStrings]
    for (var i = 0; i < layers.length; ++i) {
      var value = layers[i][key]
      if (typeof value === "string" && value.length) return value
    }
    return fallback !== undefined ? fallback : key
  }
  function formatNumber(value, decimals) {
    if (nativeAvailable) return nativeTranslator.formatNumber(value, decimals)
    var locale = Qt.locale()
    locale.numberOptions = Locale.OmitGroupSeparator
    return Number(value).toLocaleString(locale, 'f', decimals === undefined ? (String(value).split('.')[1] || "").length : decimals)
  }
  Component.onCompleted: {
    nativeComponent = Qt.createComponent(Qt.resolvedUrl("NativeTranslations.qml"), Component.PreferSynchronous)
    if (nativeComponent.status === Component.Ready) {
      nativeTranslator = nativeComponent.createObject(root, {directory: Qt.binding(function() { return root.directory })})
    }
  }
  FileView {
    path: root.directoryPath + "/en.json"
    watchChanges: true; printErrors: false; blockLoading: true
    onLoaded: root.englishStrings = root.parse(text())
    onLoadFailed: root.englishStrings = ({})
    onFileChanged: reload()
  }
  FileView {
    path: root.baseLanguage !== root.language && root.baseLanguage !== "en" ? root.directoryPath + "/" + root.baseLanguage + ".json" : ""
    watchChanges: true; printErrors: false; blockLoading: true
    onLoaded: root.baseStrings = root.parse(text())
    onLoadFailed: root.baseStrings = ({})
    onPathChanged: if (path === "") root.baseStrings = ({})
    onFileChanged: reload()
  }
  FileView {
    path: root.language !== "en" ? root.directoryPath + "/" + root.language + ".json" : ""
    watchChanges: true; printErrors: false; blockLoading: true
    onLoaded: root.languageStrings = root.parse(text())
    onLoadFailed: root.languageStrings = ({})
    onPathChanged: if (path === "") root.languageStrings = ({})
    onFileChanged: reload()
  }
}
