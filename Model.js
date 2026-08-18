// Safe ModemManager / NetworkManager parsers for the WWAN bar widget.
// Never keep IMEI, IMSI, MSISDN, own-numbers, or equipment identifiers.

var SECRET_KEY = /(imei|imsi|msisdn|own-numbers|equipment-identifier|device-identifier|number)/i

function isSecretKey(key) {
  return SECRET_KEY.test(String(key || ""))
}

function trimValue(value) {
  var text = String(value == null ? "" : value).trim()
  if (text === "" || text === "--") return ""
  return text
}

function parseKeyValue(raw) {
  var map = {}
  var lines = String(raw || "").split(/\r?\n/)
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    var sep = line.indexOf(":")
    if (sep < 0) continue
    var key = line.substring(0, sep).trim()
    if (key === "" || isSecretKey(key)) continue
    map[key] = trimValue(line.substring(sep + 1))
  }
  return map
}

function section(raw, name) {
  var text = String(raw || "")
  var startToken = "===" + name + "==="
  var start = text.indexOf(startToken)
  if (start < 0) return ""
  start += startToken.length
  var next = text.indexOf("===", start)
  if (next < 0) return text.substring(start)
  return text.substring(start, next)
}

function parseModemList(raw) {
  var text = String(raw || "").trim()
  if (text === "") return []

  if (text.charAt(0) === "{") {
    try {
      var data = JSON.parse(text)
      var list = data["modem-list"] || []
      var paths = []
      for (var i = 0; i < list.length; i++) {
        var path = String(list[i] || "")
        if (path !== "") paths.push(path)
      }
      return paths
    } catch (e) {
      return []
    }
  }

  var paths = []
  var lines = text.split(/\r?\n/)
  for (var j = 0; j < lines.length; j++) {
    var match = lines[j].match(/(\/org\/freedesktop\/ModemManager1\/Modem\/\S+)/)
    if (match) paths.push(match[1])
  }
  return paths
}

function parseNmDevices(raw) {
  var devices = []
  var lines = String(raw || "").split(/\r?\n/)
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (line === "") continue
    var parts = line.split(":")
    if (parts.length < 3) continue
    devices.push({
      device: parts[0] || "",
      type: parts[1] || "",
      state: parts[2] || "",
      connection: parts[3] || ""
    })
  }
  return devices
}

function gsmDevices(devices) {
  var result = []
  var values = Array.isArray(devices) ? devices : []
  for (var i = 0; i < values.length; i++) {
    var type = String(values[i].type || "").toLowerCase()
    if (type === "gsm" || type === "wwan") result.push(values[i])
  }
  return result
}

function parseNmConnections(raw) {
  var connections = []
  var lines = String(raw || "").split(/\r?\n/)
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    if (line === "") continue
    var parts = line.split(":")
    if (parts.length < 2) continue
    connections.push({
      name: parts[0] || "",
      type: parts[1] || "",
      device: parts[2] || "",
      state: parts[3] || ""
    })
  }
  return connections
}

function gsmConnections(connections) {
  var result = []
  var values = Array.isArray(connections) ? connections : []
  for (var i = 0; i < values.length; i++) {
    var type = String(values[i].type || "").toLowerCase()
    if (type === "gsm" || type === "wwan") result.push(values[i])
  }
  return result
}

function parseRouteDev(raw) {
  var text = String(raw || "").trim()
  if (text === "") return ""

  if (text.charAt(0) === "[" || text.charAt(0) === "{") {
    try {
      var data = JSON.parse(text)
      var row = Array.isArray(data) ? data[0] : data
      return row && row.dev ? String(row.dev) : ""
    } catch (e) {
      return ""
    }
  }

  var match = text.match(/\bdev\s+(\S+)/)
  return match ? match[1] : ""
}

function netPorts(map) {
  var ports = []
  for (var key in map) {
    if (key.indexOf("modem.generic.ports.value") !== 0) continue
    var value = String(map[key] || "")
    var match = value.match(/^(\S+)\s+\(net\)/)
    if (match) ports.push(match[1])
  }
  return ports
}

function firstAccessTech(map) {
  var techs = []
  for (var key in map) {
    if (key.indexOf("modem.generic.access-technologies.value") !== 0) continue
    var tech = String(map[key] || "").toLowerCase()
    if (tech !== "") techs.push(tech)
  }
  if (techs.length === 0) return ""
  if (techs.indexOf("5gnr") !== -1) return "5gnr"
  if (techs.indexOf("lte") !== -1) return "lte"
  return techs[0]
}

function accessTechLabel(tech) {
  var value = String(tech || "").toLowerCase()
  if (value === "5gnr" || value === "5g") return "5G"
  if (value === "lte") return "LTE"
  if (value === "umts" || value === "hsdpa" || value === "hsupa" || value === "hspa" || value === "hspa+") return "3G"
  if (value === "edge" || value === "gprs" || value === "gsm") return "2G"
  if (value === "") return ""
  return value.toUpperCase()
}

function unlockRequired(map) {
  return String(map["modem.generic.unlock-required"] || "").toLowerCase()
}

function isBlockingUnlock(unlock, state) {
  var lock = String(unlock || "").toLowerCase()
  var mmState = String(state || "").toLowerCase()
  if (lock === "" || lock === "none") return false
  if (lock === "sim-pin2") return mmState === "locked"
  return lock === "sim-pin" || lock === "sim-puk" || lock === "sim-puk2" || lock.indexOf("ph-") === 0
}

function signalPercent(map) {
  var n = parseInt(map["modem.generic.signal-quality.value"], 10)
  if (!isFinite(n)) return -1
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

// Cellular signal wedge (md-network-strength-*). The pre-Quattro Waybar
// config had no WWAN module: a connected modem reused format-ethernet
// (md-access-point, the sausage). The community 5G applet used
// signal-tier glyphs instead; these are the current Nerd Font equivalents.
function cellularIcon(percent, kind) {
  if (kind === "off" || kind === "failed" || kind === "locked") return String.fromCodePoint(0xF08F3)
  var n = parseInt(percent, 10)
  if (!isFinite(n) || n < 20) return String.fromCodePoint(0xF08F8)
  if (n < 40) return String.fromCodePoint(0xF08F4)
  if (n < 60) return String.fromCodePoint(0xF08F5)
  if (n < 80) return String.fromCodePoint(0xF08F6)
  return String.fromCodePoint(0xF08F7)
}

function iconKind(state, blocking) {
  var mmState = String(state || "").toLowerCase()
  if (blocking) return "locked"
  if (mmState === "failed" || mmState === "unknown") return "failed"
  if (mmState === "disabled" || mmState === "disabling") return "off"
  return "ok"
}

function isConnectedState(state) {
  return String(state || "").toLowerCase() === "connected"
}

function isActivatedConnection(conn) {
  return String(conn && conn.state || "").toLowerCase() === "activated"
}

function pickGsmProfile(connections) {
  var values = Array.isArray(connections) ? connections : []
  var fallback = null
  for (var i = 0; i < values.length; i++) {
    if (!fallback) fallback = values[i]
    if (isActivatedConnection(values[i])) return values[i]
  }
  return fallback
}

function parsePresence(raw) {
  var listRaw = section(raw, "LIST")
  var nmRaw = section(raw, "NM")
  if (listRaw === "" && nmRaw === "" && String(raw || "").indexOf("===") < 0) {
    listRaw = raw
  }
  var modems = parseModemList(listRaw)
  var gsm = gsmDevices(parseNmDevices(nmRaw))
  return {
    modemPresent: modems.length > 0 || gsm.length > 0,
    modemPaths: modems,
    gsmDevices: gsm
  }
}

function parseStatus(raw) {
  var map = parseKeyValue(section(raw, "MODEM") || raw)
  var routeDev = parseRouteDev(section(raw, "ROUTE"))
  var connections = gsmConnections(parseNmConnections(section(raw, "NMCONN")))
  var state = String(map["modem.generic.state"] || "").toLowerCase()
  var unlock = unlockRequired(map)
  var blocking = isBlockingUnlock(unlock, state)
  var ports = netPorts(map)
  var profile = pickGsmProfile(connections)
  var nmConnected = false
  for (var i = 0; i < connections.length; i++) {
    if (isActivatedConnection(connections[i])) nmConnected = true
  }
  // When an NM gsm profile exists, it owns "connected". MM can stay
  // "connected" after `nmcli connection down` and must not keep the
  // toggle on.
  var connected = profile ? nmConnected : isConnectedState(state)
  var defaultRoute = false
  if (routeDev !== "") {
    if (ports.indexOf(routeDev) !== -1) defaultRoute = true
    if (profile && profile.device === routeDev) defaultRoute = true
  }

  return {
    ok: true,
    state: state,
    failedReason: String(map["modem.generic.state-failed-reason"] || ""),
    powerState: String(map["modem.generic.power-state"] || ""),
    operatorName: String(map["modem.3gpp.operator-name"] || map["modem.generic.operator-name"] || ""),
    registration: String(map["modem.3gpp.registration-state"] || ""),
    accessTech: firstAccessTech(map),
    signal: signalPercent(map),
    unlock: unlock,
    blockingUnlock: blocking,
    pin2Footnote: unlock === "sim-pin2" && !blocking,
    netPorts: ports,
    routeDev: routeDev,
    defaultRoute: defaultRoute,
    connected: connected,
    profileName: profile ? String(profile.name || "") : "",
    hasNmProfile: !!profile
  }
}

function connectCommand(status) {
  if (status && status.hasNmProfile && status.profileName) {
    return ["nmcli", "connection", "up", "id", status.profileName]
  }
  return ["mmcli", "-m", "any", "--simple-connect"]
}

function disconnectCommand(status) {
  if (status && status.hasNmProfile && status.profileName) {
    return ["nmcli", "connection", "down", "id", status.profileName]
  }
  return ["mmcli", "-m", "any", "--simple-disconnect"]
}

if (typeof module !== "undefined") {
  module.exports = {
    isSecretKey: isSecretKey,
    parseKeyValue: parseKeyValue,
    section: section,
    parseModemList: parseModemList,
    parseNmDevices: parseNmDevices,
    gsmDevices: gsmDevices,
    parseNmConnections: parseNmConnections,
    gsmConnections: gsmConnections,
    parseRouteDev: parseRouteDev,
    netPorts: netPorts,
    firstAccessTech: firstAccessTech,
    accessTechLabel: accessTechLabel,
    isBlockingUnlock: isBlockingUnlock,
    signalPercent: signalPercent,
    cellularIcon: cellularIcon,
    iconKind: iconKind,
    isActivatedConnection: isActivatedConnection,
    pickGsmProfile: pickGsmProfile,
    parsePresence: parsePresence,
    parseStatus: parseStatus,
    connectCommand: connectCommand,
    disconnectCommand: disconnectCommand
  }
}
