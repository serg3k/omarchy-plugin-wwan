import QtQuick
import Quickshell
import Quickshell.Io
import "Model.js" as Model

Item {
  id: root

  property var settings: ({})
  property bool panelOpen: false

  property bool presenceKnown: false
  property bool modemPresent: false
  property bool connected: false
  property int _desired: -1
  readonly property bool active: _desired === -1 ? connected : (_desired === 1)

  property string state: ""
  property string operatorName: ""
  property string accessTech: ""
  property int signal: -1
  property string unlock: ""
  property bool blockingUnlock: false
  property bool pin2Footnote: false
  property bool defaultRoute: false
  property string profileName: ""
  property bool hasNmProfile: false
  property string powerState: ""
  property string registration: ""
  property string failedReason: ""
  property string actionStatus: ""
  property string lastError: ""
  property bool refreshing: false

  readonly property int refreshIntervalSec: intSetting("refreshIntervalSec", 10, 5, 3600)
  readonly property int openRefreshIntervalSec: 3
  readonly property bool busy: presenceProcess.running || statusProcess.running || actionProcess.running

  property var _status: ({})
  property string _presenceOutput: ""
  property string _statusOutput: ""

  function setting(name, fallback) {
    var value = settings ? settings[name] : undefined
    return value === undefined || value === null ? fallback : value
  }

  function intSetting(name, fallback, min, max) {
    var n = parseInt(String(setting(name, fallback)), 10)
    if (!isFinite(n)) n = fallback
    if (n < min) n = min
    if (n > max) n = max
    return n
  }

  function elideStatus(text) {
    var value = String(text || "").replace(/\s+/g, " ").trim()
    return value.length > 140 ? value.substring(0, 137) + "…" : value
  }

  function resetAbsent() {
    connected = false
    _desired = -1
    state = ""
    operatorName = ""
    accessTech = ""
    signal = -1
    unlock = ""
    blockingUnlock = false
    pin2Footnote = false
    defaultRoute = false
    profileName = ""
    hasNmProfile = false
    powerState = ""
    registration = ""
    failedReason = ""
    _status = {}
  }

  function refresh() {
    if (!presenceProcess.running) {
      refreshing = true
      presenceProcess.running = true
    }
  }

  function refreshStatus() {
    if (!modemPresent || statusProcess.running) return
    statusProcess.running = true
  }

  function applyPresence(raw) {
    var parsed = Model.parsePresence(raw)
    presenceKnown = true
    modemPresent = parsed.modemPresent === true
    if (!modemPresent) {
      resetAbsent()
      lastError = ""
      return
    }
    refreshStatus()
  }

  function applyStatus(raw) {
    var parsed = Model.parseStatus(raw)
    if (!parsed || parsed.ok !== true) {
      lastError = "Failed to read modem status"
      return
    }
    _status = parsed
    state = String(parsed.state || "")
    operatorName = String(parsed.operatorName || "")
    accessTech = String(parsed.accessTech || "")
    signal = typeof parsed.signal === "number" ? parsed.signal : -1
    unlock = String(parsed.unlock || "")
    blockingUnlock = parsed.blockingUnlock === true
    pin2Footnote = parsed.pin2Footnote === true
    defaultRoute = parsed.defaultRoute === true
    profileName = String(parsed.profileName || "")
    hasNmProfile = parsed.hasNmProfile === true
    powerState = String(parsed.powerState || "")
    registration = String(parsed.registration || "")
    failedReason = String(parsed.failedReason || "")
    connected = parsed.connected === true
    if (_desired !== -1 && connected === (_desired === 1)) _desired = -1
  }

  function toggleConnection() {
    if (!modemPresent || actionProcess.running) return
    if (active) disconnect()
    else connect()
  }

  function connect() {
    runAction(Model.connectCommand(_status), 1)
  }

  function disconnect() {
    runAction(Model.disconnectCommand(_status), 0)
  }

  function runAction(command, desired) {
    if (!command || actionProcess.running) return
    _desired = desired
    lastError = ""
    actionStatus = ""
    actionProcess.command = command
    actionProcess.running = true
  }

  readonly property string icon: Model.cellularIcon(signal, Model.iconKind(state, blockingUnlock, connected))

  Timer {
    id: refreshTimer
    interval: (root.panelOpen ? root.openRefreshIntervalSec : root.refreshIntervalSec) * 1000
    repeat: true
    running: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Timer {
    id: delayedRefresh
    interval: 800
    repeat: false
    onTriggered: root.refresh()
  }

  Timer {
    id: settleTimer
    property int ticks: 0
    interval: 1200
    repeat: true
    running: false
    onTriggered: {
      settleTimer.ticks += 1
      root.refresh()
      if (settleTimer.ticks >= 5) {
        settleTimer.ticks = 0
        settleTimer.running = false
        root._desired = -1
      }
    }
  }

  Process {
    id: presenceProcess
    running: false
    command: [
      "bash", "-c",
      "printf '%s\\n' '===LIST==='; mmcli -L 2>/dev/null || true; printf '%s\\n' '===NM==='; nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device 2>/dev/null || true"
    ]
    stdout: StdioCollector {
      id: presenceStdout
      waitForEnd: true
      onStreamFinished: {
        root._presenceOutput = text
        root.applyPresence(text)
      }
    }
    stderr: StdioCollector { id: presenceStderr; waitForEnd: true }
    onExited: function() {
      root.refreshing = false
      if (root._presenceOutput === "") root.applyPresence(presenceStdout.text || "")
    }
  }

  Process {
    id: statusProcess
    running: false
    command: [
      "bash", "-c",
      "printf '%s\\n' '===MODEM==='; mmcli -m any --output-keyvalue 2>/dev/null || true; printf '%s\\n' '===ROUTE==='; ip route get 1.1.1.1 2>/dev/null || true; printf '%s\\n' '===NM==='; nmcli -t -f DEVICE,TYPE,STATE,CONNECTION device 2>/dev/null || true; printf '%s\\n' '===NMCONN==='; nmcli -t -f NAME,TYPE,DEVICE,STATE connection show 2>/dev/null || true"
    ]
    stdout: StdioCollector {
      id: statusStdout
      waitForEnd: true
      onStreamFinished: {
        root._statusOutput = text
        root.applyStatus(text)
      }
    }
    stderr: StdioCollector { id: statusStderr; waitForEnd: true }
    onExited: function() {
      if (root._statusOutput === "") root.applyStatus(statusStdout.text || "")
    }
  }

  Process {
    id: actionProcess
    running: false
    command: []
    stdout: StdioCollector { id: actionStdout; waitForEnd: true }
    stderr: StdioCollector { id: actionStderr; waitForEnd: true }
    onExited: function(exitCode) {
      var stdout = String(actionStdout.text || "")
      var stderr = String(actionStderr.text || "")
      if (exitCode !== 0) {
        root._desired = -1
        root.lastError = root.elideStatus(stderr || stdout || "Mobile data command failed")
        root.actionStatus = root.lastError
      } else {
        root.lastError = ""
        root.actionStatus = ""
      }
      settleTimer.ticks = 0
      settleTimer.restart()
      delayedRefresh.restart()
    }
  }
}
