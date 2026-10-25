import QtQuick
import Quickshell
import "Plugin" as Plugin

ShellRoot {
  id: testRoot
  Plugin.PluginTranslations { id: strings }
  property var languageControl: null
  property var service: null
  Item {
    id: mockBar
    property color foreground: "white"
    property color urgent: "red"
    property bool foregroundAnimationEnabled: false
    property color barForeground: "white"
    property color popupForeground: "white"
    property color popupBackground: "black"
    property bool tooltipsEnabled: false
    function hideTooltip() {}
    function showTooltip() {}
    property color background: "#202020"
    property string fontFamily: "monospace"
    property string position: "top"
    property int barSize: 30
    property var activePopout: false
    function requestPopout(owner) { activePopout=owner }
    function releasePopout(owner) { activePopout=false }
    property var shell: null
    property bool vertical: false
    property int iconSize: 18
  }
  Plugin.Panel { id: panel; bar: mockBar }
  function findItem(obj, name) {
    if (!obj) return null
    if (obj.objectName === name) return obj
    if (obj.length !== undefined) {
      for (var n=0;n<obj.length;++n) { var found=findItem(obj[n],name);if(found)return found }
      return null
    }
    var children=obj.children || []
    for(var i=0;i<children.length;++i) { var found=findItem(children[i],name);if(found)return found }
    return null
  }
  Timer {
    property int phase: 0
    property int attempts: 0
    property int previewTicks: 0
    property int languageIndex: 0
    property var languageCases: [
      ["ar","بيانات الهاتف المحمول"], ["es","Datos móviles"],
      ["fr","Données mobiles"], ["it","Dati mobili"],
      ["pt","Dados móveis"], ["pt-BR","Dados móveis"],
      ["pl","Dane komórkowe"], ["ru","Мобильные данные"],
      ["zh-CN","移动数据"], ["ja","モバイルデータ"],
      ["ko","모바일 데이터"], ["hi","मोबाइल डेटा"],
      ["de-AT","Mobile Daten"], ["en","Mobile data"]
    ]
    interval: 100; running: true; repeat: true
    onTriggered: {
      function check(value, message) { if (!value) throw new Error(message) }
      try {
        if (++attempts > 80) throw new Error("WWAN flow timed out")
        if (phase === 0) {
          service=panel.children.find(function(child) { return child.modemPresent !== undefined })
          if (!service || !service.presenceKnown || service.busy) return
          check(service.modemPresent && service.connected && service.operatorName === "Mock Mobile", "stub-only status discovery")
          check(service.dataInterface === "mock0", "NetworkManager cellular IP interface discovery")
          if (strings.nativeAvailable) {
            languageControl=Qt.createQmlObject('import QtQuick; import qs.Commons as C; QtObject { function setLanguage(code) { C.I18n.setLanguage(code) } }',testRoot)
            languageControl.setLanguage(Quickshell.env("PLUGIN_TEST_LANGUAGE") || "de")
          }
          phase++; return
        }
        if (phase === 1) {
          if (Quickshell.env("PLUGIN_TEST_PREVIEW")) {
            if (strings.language !== (Quickshell.env("PLUGIN_TEST_LANGUAGE") || "de")) return
            panel.open(); phase=10; return
          }
          if (strings.t("Mobile data") !== "Mobile Daten") return
          check(panel.heroMeta === "Internet über WWAN", "live translated internet route")
          check(strings.formatNumber(13.1,1) === "13,1", "German number formatting")
          check(panel.formatBytes(1500, true) === "1,5 KB/s", "localized transfer rate")
          check(panel.formatBytes(-1, true) === "—", "missing transfer sample")
          service.radioEnabled=false
          check(panel.heroMeta === "Mobilfunk ausgeschaltet", "radio off localized")
          service.radioEnabled=true
          service.connected=false; service.state="registered"
          check(panel.heroMeta === "Registriert, nicht verbunden", "translated disconnected state")
          check(service.state === "registered", "machine state preserved")
          service.blockingUnlock=true
          check(panel.heroMeta === "SIM-Sperre verhindert die Verbindung", "SIM lock status")
          var popup=panel.data.find(function(child) { return child.contentItem !== undefined })
          var hero=findItem(popup.contentItem,"wwanHero")
          var action=findItem(popup.contentItem,"wwanActionStatus")
          check(hero && action, "production text sinks present")
          service.operatorName='<img src="https://example.invalid/tracker">'
          service.failedReason='<img src="https://example.invalid/failure">'
          service.blockingUnlock=false; service.state="failed"
          service.lastError='<img src="https://example.invalid/error">'
          check(hero.title === service.operatorName, "operator preserved literally")
          check(hero.meta === service.failedReason, "failure preserved literally")
          function findLiteral(item,value) {
            if (item.text === value && item.textFormat === Text.PlainText) return true
            var children=item.children || []
            for(var n=0;n<children.length;++n) if(findLiteral(children[n],value))return true
            return false
          }
          service.connected=true; service.defaultRoute=true
          check(findItem(popup.contentItem,"wwanInternetRoute").value === "WWAN wird verwendet", "cellular internet route indicated")
          service.state="connected"
          check(panel.heroMeta === "Internet über WWAN", "prominent active internet header")
          service.defaultRoute=false
          check(findItem(popup.contentItem,"wwanInternetRoute").value === "Andere Verbindung wird verwendet", "alternate internet route indicated")
          service.state="failed"
          check(findLiteral(hero,service.operatorName),"operator uses plain text")
          check(findLiteral(hero,service.failedReason.toUpperCase()),"failure uses plain text")
          check(action.textFormat === Text.PlainText && action.text === service.lastError, "error rendered as plain text")
          service.lastError="Mobile data command failed"
          check(action.text === "Befehl für mobile Daten fehlgeschlagen", "known error translated")
          service.operatorName=""; service.lastError="";service.failedReason="";service.state="";service.connected=false
          check(panel.heroTitle === "Mobile Daten" && panel.heroMeta === "Wird geprüft…", "fallback title/status")
          if (!strings.nativeAvailable) {
            check(strings.language === "de-AT", "legacy process locale")
            console.log("PASS: legacy locale, WWAN states, numbers and safe operator/error text")
            Qt.quit(); return
          }
          languageControl.setLanguage("ar"); phase++; return
        }
        if (phase === 2) {
          var current=languageCases[languageIndex]
          if (strings.language !== current[0] || panel.heroTitle !== current[1]) return
          if (current[0] === "ar" && !strings.rightToLeft) return
          if (current[0] !== "ar" && strings.rightToLeft) return
          if (++languageIndex < languageCases.length) {
            languageControl.setLanguage(languageCases[languageIndex][0]); return
          }
          languageControl.setLanguage("is"); phase++; return
        }
        if (phase === 3) {
          if (strings.language !== "is" || panel.heroTitle !== "Mobile data") return
          check(!strings.rightToLeft,"LTR restored")
          check(strings.t("state.unlisted","unlisted") === "unlisted","unknown diagnostics preserved")
          console.log("PASS: native live catalogs, regional fallback, RTL, WWAN states and safe text sinks")
          Qt.quit()
        }
        if (phase === 10) {
          if (service.busy || ++previewTicks < 6) return
          var popup=panel.data.find(function(child) { return child.contentItem !== undefined })
          var content=findItem(popup.contentItem,"wwanContent")
          check(content !== null,"preview content")
          content.grabToImage(function(result) {
            result.saveToFile(Quickshell.env("PLUGIN_TEST_PREVIEW"))
            console.log("PASS: translated production panel preview")
            Qt.quit()
          })
          running=false
        }
      } catch(error) { console.log("FAIL: " + error); Qt.quit() }
    }
  }
}
