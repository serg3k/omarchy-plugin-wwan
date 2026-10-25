import qs.Commons as Commons

// Loaded dynamically: older Commons modules must never parse this component.
Commons.Translations {
  readonly property bool rightToLeft: Commons.I18n.rightToLeft
  function formatNumber(value, decimals) {
    return Commons.I18n.formatNumber(value, decimals)
  }
}
