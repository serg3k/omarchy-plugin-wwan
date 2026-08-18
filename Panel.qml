import QtQuick
import QtQuick.Controls
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "io.github.serg3k.omarchy-plugin-wwan"
  ipcTarget: "omarchy-plugin-wwan"
  manageIpc: false

  property string focusSection: "header"
  property bool cursorActive: false
  property int phraseIndex: 0

  readonly property color foreground: bar ? bar.foreground : Color.foreground
  readonly property color urgent: bar ? bar.urgent : Color.urgent
  readonly property color dim: Qt.darker(foreground, 1.55)
  readonly property string fontFamily: bar ? bar.fontFamily : Style.font.family
  readonly property bool headerHasCursor: cursorActive && focusSection === "header" && wwan.modemPresent
  readonly property bool canToggle: wwan.modemPresent && !wwan.blockingUnlock
  readonly property string toggleHint: wwan.active ? "Disconnect mobile data" : "Connect mobile data"
  readonly property color iconColor: {
    if (wwan.blockingUnlock || wwan.state === "failed") return urgent
    if (wwan.active) return foreground
    return dim
  }
  readonly property color barIconColor: {
    if (wwan.blockingUnlock || wwan.state === "failed") return urgent
    if (wwan.active) return barForeground
    return Qt.darker(barForeground, 1.55)
  }
  readonly property var activePhrases: [
    "Holding the bearer",
    "Riding the tower",
    "Borrowing bars",
    "Keeping the session"
  ]
  readonly property string heroTitle: wwan.operatorName !== "" ? wwan.operatorName : "Mobile data"
  readonly property string heroMeta: {
    if (wwan.blockingUnlock) return "SIM lock blocks connect"
    if (wwan.state === "failed") return wwan.failedReason !== "" ? wwan.failedReason : "Modem failed"
    if (wwan.active) return activePhrases[phraseIndex % activePhrases.length]
    if (wwan.state === "connected") return "Disconnected"
    if (wwan.state === "registered" || wwan.state === "enabled" || wwan.state === "searching") return "Registered, disconnected"
    if (wwan.state !== "") return wwan.state
    return "Checking…"
  }

  function setHeaderCursor() {
    cursorActive = true
    focusSection = "header"
  }

  function activateCursor() {
    if (canToggle) wwan.toggleConnection()
  }

  visible: wwan.presenceKnown && wwan.modemPresent
  implicitWidth: visible ? button.implicitWidth : 0
  implicitHeight: visible ? button.implicitHeight : 0

  onOpenedChanged: {
    wwan.panelOpen = opened
    if (opened) {
      if (!wwan.modemPresent) {
        close()
        return
      }
      cursorActive = false
      wwan.refresh()
      Qt.callLater(function() { keyCatcher.forceActiveFocus() })
    }
  }

  onVisibleChanged: if (!visible) close()

  Service {
    id: wwan
    settings: root.settings
  }

  IpcHandler {
    target: root.ipcTarget
    function open(): void { root.open() }
    function close(): void { root.close() }
    function show(): void { root.open() }
    function hide(): void { root.close() }
    function toggle(): void { root.toggle() }
    function refresh(): string { wwan.refresh(); return "ok" }
    function up(): string { wwan.connect(); return "ok" }
    function down(): string { wwan.disconnect(); return "ok" }
    function toggleConnection(): string { wwan.toggleConnection(); return "ok" }
    function status(): string { return wwan.state }
  }

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: wwan.icon
    foreground: root.barIconColor
    onPressed: function(buttonCode) {
      if (buttonCode === Qt.RightButton) wwan.toggleConnection()
      else if (buttonCode === Qt.MiddleButton) wwan.refresh()
      else root.toggle()
    }
  }

  KeyboardPanel {
    id: panel
    anchorItem: button
    owner: root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(360))
    contentHeight: panel.fittedContentHeight(column.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onMoveRequested: function() {
        root.cursorActive = true
        root.focusSection = "header"
      }
      onActivateRequested: if (root.cursorActive) root.activateCursor()
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onTextKey: function(t) {
        if (t === "t" || t === "T") wwan.toggleConnection()
        else if (t === "r" || t === "R") wwan.refresh()
      }

      Column {
        id: column
        anchors.fill: parent
        spacing: Style.space(12)

        Item {
          id: header
          width: parent.width
          implicitHeight: hero.implicitHeight
          readonly property bool ringVisible: root.headerHasCursor
          function focusHero() { root.setHeaderCursor() }

          PanelHero {
            id: hero
            width: parent.width
            title: root.heroTitle
            meta: root.heroMeta
            foreground: root.foreground
            fontFamily: root.fontFamily
            iconOpacity: wwan.active ? 1.0 : 0.5
            iconComponent: Component {
              Text {
                text: wwan.icon
                color: root.iconColor
                font.family: root.fontFamily
                font.pixelSize: Style.font.display
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
              }
            }
            trailingControl: Component {
              ToggleSwitch {
                id: powerSwitch
                visible: root.canToggle
                checked: wwan.active
                busy: wwan.busy
                hasCursor: header.ringVisible
                foreground: hero.foreground
                onHovered: function(on) { if (on) header.focusHero() }
                onToggled: wwan.toggleConnection()

                PanelToolTip {
                  visible: powerSwitch.containsMouse
                  text: root.toggleHint
                  fontFamily: hero.fontFamily
                }
              }
            }
          }
        }

        Text {
          visible: wwan.actionStatus !== "" || wwan.lastError !== ""
          width: parent.width
          text: wwan.actionStatus !== "" ? wwan.actionStatus : wwan.lastError
          color: wwan.lastError !== "" && wwan.actionStatus === "" ? root.urgent : root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.bodySmall
          wrapMode: Text.WordWrap
        }

        Column {
          width: parent.width
          spacing: Style.spacing.labelGap

          InfoPair { label: "State"; value: wwan.state !== "" ? wwan.state : "—" }
          InfoPair {
            label: "Radio"
            value: {
              var tech = Model.accessTechLabel(wwan.accessTech)
              var signal = wwan.signal >= 0 ? wwan.signal + "%" : "—"
              return tech !== "" ? tech + " · " + signal : signal
            }
          }
          InfoPair {
            visible: wwan.profileName !== ""
            label: "Profile"
            value: wwan.profileName
          }
          InfoPair {
            visible: wwan.blockingUnlock
            label: "SIM"
            value: wwan.unlock
          }
          InfoPair {
            visible: wwan.connected && !wwan.defaultRoute
            label: "Route"
            value: "not default"
          }
        }

        Text {
          visible: wwan.pin2Footnote
          width: parent.width
          text: "sim-pin2 is FDN on this SIM, not a connect lock."
          color: root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          wrapMode: Text.WordWrap
        }

        Text {
          visible: wwan.powerState === "low" || wwan.state === "enabling"
          width: parent.width
          text: "Stuck in enabling or low power usually means the host still needs an FCC unlock symlink."
          color: root.dim
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          wrapMode: Text.WordWrap
        }
      }
    }
  }

  Timer {
    interval: 2800
    running: root.opened && wwan.active
    repeat: true
    onTriggered: root.phraseIndex = (root.phraseIndex + 1) % root.activePhrases.length
  }

  component InfoPair: Row {
    property string label: ""
    property string value: ""

    width: parent.width
    spacing: Style.space(8)
    visible: value !== ""

    InfoLabel { text: label }
    Item { width: Math.max(0, parent.width - parent.children[0].implicitWidth - parent.children[2].implicitWidth - parent.spacing * 2); height: 1 }
    InfoValue { text: value }
  }

  component InfoLabel: Text {
    color: root.foreground
    opacity: 0.6
    font.family: root.fontFamily
    font.pixelSize: Style.font.bodySmall
  }

  component InfoValue: Text {
    color: root.foreground
    font.family: root.fontFamily
    font.pixelSize: Style.font.bodySmall
    elide: Text.ElideRight
  }
}
