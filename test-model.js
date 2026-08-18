const assert = require("assert")
const Model = require("./Model.js")

function pass(name) {
  console.log("ok - " + name)
}

assert.strictEqual(Model.isSecretKey("modem.3gpp.imei"), true)
assert.strictEqual(Model.isSecretKey("modem.generic.own-numbers.value[1]"), true)
assert.strictEqual(Model.isSecretKey("modem.generic.state"), false)
pass("secret-key filter")

const leaked = Model.parseKeyValue([
  "modem.generic.state                             : connected",
  "modem.3gpp.imei                                 : 016510003745627",
  "modem.generic.own-numbers.value[1]              : +491711024913",
  "modem.generic.equipment-identifier              : 016510003745627",
  "modem.3gpp.operator-name                        : Telekom.de",
  "modem.generic.signal-quality.value              : 38",
  "modem.generic.unlock-required                   : sim-pin2",
  "modem.generic.access-technologies.value[1]      : lte",
  "modem.generic.ports.value[1]                    : cdc-wdm0 (mbim)",
  "modem.generic.ports.value[2]                    : wwp198s0f0u3 (net)"
].join("\n"))

assert.strictEqual(leaked["modem.3gpp.imei"], undefined)
assert.strictEqual(leaked["modem.generic.own-numbers.value[1]"], undefined)
assert.strictEqual(leaked["modem.generic.equipment-identifier"], undefined)
assert.strictEqual(leaked["modem.3gpp.operator-name"], "Telekom.de")
assert.deepStrictEqual(Model.netPorts(leaked), ["wwp198s0f0u3"])
pass("keyvalue drops secrets and keeps operator/ports")

assert.deepStrictEqual(
  Model.parseModemList("    /org/freedesktop/ModemManager1/Modem/1 [Quectel] EM061K-GL"),
  ["/org/freedesktop/ModemManager1/Modem/1"]
)
assert.deepStrictEqual(Model.parseModemList('{"modem-list":[]}'), [])
assert.deepStrictEqual(
  Model.parseModemList('{"modem-list":["/org/freedesktop/ModemManager1/Modem/1"]}'),
  ["/org/freedesktop/ModemManager1/Modem/1"]
)
pass("modem list text and json")

const presence = Model.parsePresence([
  "===LIST===",
  "    /org/freedesktop/ModemManager1/Modem/1 [Quectel] EM061K-GL",
  "===NM===",
  "wlp194s0:wifi:connected:home",
  "cdc-wdm0:gsm:connected:v6-telekom"
].join("\n"))
assert.strictEqual(presence.modemPresent, true)
assert.strictEqual(presence.gsmDevices[0].connection, "v6-telekom")

const absent = Model.parsePresence("===LIST===\nNo modems were found\n===NM===\nwlp194s0:wifi:connected:home\n")
assert.strictEqual(absent.modemPresent, false)
pass("presence from list or gsm device")

const status = Model.parseStatus([
  "===MODEM===",
  "modem.generic.state                             : connected",
  "modem.generic.unlock-required                   : sim-pin2",
  "modem.3gpp.operator-name                        : Telekom.de",
  "modem.generic.access-technologies.value[1]      : lte",
  "modem.generic.signal-quality.value              : 38",
  "modem.generic.ports.value[2]                    : wwp198s0f0u3 (net)",
  "===ROUTE===",
  "1.1.1.1 via 192.0.0.1 dev wwp198s0f0u3 src 192.0.0.2 uid 1000",
  "===NMCONN===",
  "v6-telekom:gsm:cdc-wdm0:activated"
].join("\n"))

assert.strictEqual(status.operatorName, "Telekom.de")
assert.strictEqual(status.accessTech, "lte")
assert.strictEqual(status.signal, 38)
assert.strictEqual(status.connected, true)
assert.strictEqual(status.blockingUnlock, false)
assert.strictEqual(status.pin2Footnote, true)
assert.strictEqual(status.defaultRoute, true)
assert.strictEqual(status.profileName, "v6-telekom")
assert.deepStrictEqual(Model.connectCommand(status), ["nmcli", "connection", "up", "id", "v6-telekom"])
assert.deepStrictEqual(Model.disconnectCommand(status), ["nmcli", "connection", "down", "id", "v6-telekom"])
pass("status: connected, FDN footnote, NM profile, default route")

const locked = Model.parseStatus([
  "===MODEM===",
  "modem.generic.state                             : locked",
  "modem.generic.unlock-required                   : sim-pin",
  "===NMCONN==="
].join("\n"))
assert.strictEqual(locked.blockingUnlock, true)
assert.strictEqual(locked.pin2Footnote, false)
assert.deepStrictEqual(Model.connectCommand(locked), ["mmcli", "-m", "any", "--simple-connect"])
pass("status: blocking PIN falls back to mmcli")

const wifiDefault = Model.parseStatus([
  "===MODEM===",
  "modem.generic.state                             : connected",
  "modem.generic.ports.value[1]                    : wwp198s0f0u3 (net)",
  "===ROUTE===",
  "1.1.1.1 via 192.168.1.1 dev wlp194s0 src 192.168.1.20",
  "===NMCONN===",
  "v6-telekom:gsm:cdc-wdm0:activated"
].join("\n"))
assert.strictEqual(wifiDefault.connected, true)
assert.strictEqual(wifiDefault.defaultRoute, false)
pass("connected modem is still shown when Wi-Fi owns the default route")

const profileDown = Model.parseStatus([
  "===MODEM===",
  "modem.generic.state                             : connected",
  "modem.generic.ports.value[1]                    : wwp198s0f0u3 (net)",
  "===NMCONN===",
  "v6-telekom:gsm::"
].join("\n"))
assert.strictEqual(profileDown.hasNmProfile, true)
assert.strictEqual(profileDown.profileName, "v6-telekom")
assert.strictEqual(profileDown.connected, false)
assert.deepStrictEqual(Model.connectCommand(profileDown), ["nmcli", "connection", "up", "id", "v6-telekom"])
assert.deepStrictEqual(Model.disconnectCommand(profileDown), ["nmcli", "connection", "down", "id", "v6-telekom"])
pass("NM profile down is disconnected even when MM still says connected")

assert.strictEqual(Model.accessTechLabel("lte"), "LTE")
assert.strictEqual(Model.accessTechLabel("5gnr"), "5G")
assert.strictEqual(Model.iconKind("failed", false), "failed")
assert.strictEqual(Model.iconKind("connected", true), "locked")
assert.strictEqual(Model.cellularIcon(38, "ok"), String.fromCodePoint(0xF08F4))
assert.strictEqual(Model.cellularIcon(80, "ok"), String.fromCodePoint(0xF08F7))
assert.strictEqual(Model.cellularIcon(0, "off"), String.fromCodePoint(0xF08F3))
pass("labels and icons")

console.log("all tests passed")
