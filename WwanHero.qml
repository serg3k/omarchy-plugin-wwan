import QtQuick
import QtQuick.Layouts
import qs.Commons as Commons

// Keep provider and failure text literal on every supported shell version.
// Shared hero components on older shells interpret markup automatically.
RowLayout {
  id: root
  property string title: ""
  property string meta: ""
  property Component iconComponent: null
  property Component trailingControl: null
  property color foreground: Commons.Color.foreground
  property string fontFamily: Commons.Style.font.family
  property real iconOpacity: 1.0
  spacing: Commons.Style.space(14)

  Loader {
    sourceComponent: root.iconComponent
    opacity: root.iconOpacity
    Layout.alignment: Qt.AlignVCenter
  }
  ColumnLayout {
    Layout.fillWidth: true
    spacing: Commons.Style.space(2)
    Text {
      Layout.fillWidth: true
      textFormat: Text.PlainText
      text: root.title
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Commons.Style.font.title
      font.bold: true
      elide: Text.ElideRight
    }
    Text {
      Layout.fillWidth: true
      textFormat: Text.PlainText
      text: root.meta.toUpperCase()
      visible: text !== ""
      color: Qt.darker(root.foreground, 1.4)
      font.family: root.fontFamily
      font.pixelSize: Commons.Style.font.caption
      font.bold: true
      font.letterSpacing: 1.2
      elide: Text.ElideRight
    }
  }
  Loader {
    sourceComponent: root.trailingControl
    Layout.alignment: Qt.AlignVCenter
  }
}
