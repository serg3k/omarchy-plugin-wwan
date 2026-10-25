const assert = require("assert")
const Model = require("./Model.js")

function pass(name) {
  console.log("ok - " + name)
}

function assertConnectScript(status, snippets) {
  const cmd = Model.connectCommand(status)
  assert.strictEqual(cmd[0], "bash")
  assert.strictEqual(cmd[1], "-c")
  snippets.forEach(function(snippet) {
    assert.ok(cmd[2].indexOf(snippet) !== -1, "missing: " + snippet + " in " + cmd[2])
  })
  return cmd[2]
}

function assertDisconnectScript(status, snippets) {
  const cmd = Model.disconnectCommand(status)
  assert.strictEqual(cmd[0], "bash")
  assert.strictEqual(cmd[1], "-c")
  snippets.forEach(function(snippet) {
    assert.ok(cmd[2].indexOf(snippet) !== -1, "missing: " + snippet + " in " + cmd[2])
  })
  return cmd[2]
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
assertConnectScript(status, [
  "rfkill unblock wwan",
  "nmcli radio wwan on",
  "mmcli -m any --enable",
  "nmcli connection up id 'v6-telekom'"
])
assertDisconnectScript(status, [
  "nmcli connection down id 'v6-telekom'",
  "mmcli -m any --simple-disconnect"
])
pass("status: connected, FDN footnote, NM profile, default route")

const locked = Model.parseStatus([
  "===MODEM===",
  "modem.generic.state                             : locked",
  "modem.generic.unlock-required                   : sim-pin",
  "===NMCONN==="
].join("\n"))
assert.strictEqual(locked.blockingUnlock, true)
assert.strictEqual(locked.pin2Footnote, false)
assertConnectScript(locked, [
  "rfkill unblock wwan",
  "mmcli -m any --simple-connect"
])
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
assert.strictEqual(Model.iconKind(profileDown.state, false, profileDown.connected), "disconnected")
assert.strictEqual(Model.cellularIcon(38, "disconnected"), String.fromCodePoint(0xF08FE))
assertConnectScript(profileDown, ["nmcli connection up id 'v6-telekom'"])
assertDisconnectScript(profileDown, [
  "nmcli connection down id 'v6-telekom'",
  "mmcli -m any --simple-disconnect"
])
pass("NM profile down is disconnected even when MM still says connected")

const radioOff = Model.parseStatus([
  "===MODEM===",
  "modem.generic.state                             : disabled",
  "modem.generic.power-state                       : low",
  "===NM===",
  "cdc-wdm0:gsm:unavailable:",
  "enp195s0f0:ethernet:unavailable:",
  "===NMCONN===",
  "v6-telekom:gsm::"
].join("\n"))
assert.strictEqual(radioOff.connected, false)
assert.strictEqual(radioOff.gsmDevice, "cdc-wdm0")
assertConnectScript(radioOff, [
  "rfkill unblock wwan",
  "nmcli radio wwan on",
  "mmcli -m any --enable",
  "nmcli device set 'cdc-wdm0' managed yes",
  "nmcli connection up id 'v6-telekom' ifname 'cdc-wdm0'"
])
assert.ok(Model.connectCommand(radioOff)[2].indexOf("enp195s0f0") === -1)
pass("connect enables radio and the gsm device before the profile")

assert.strictEqual(Model.accessTechLabel("lte"), "LTE")
assert.strictEqual(Model.accessTechLabel("5gnr"), "5G")
assert.strictEqual(Model.iconKind("failed", false), "failed")
assert.strictEqual(Model.iconKind("connected", true), "locked")
assert.strictEqual(Model.iconKind("connected", false, false), "disconnected")
assert.strictEqual(Model.iconKind("disabled", false, false), "off")
assert.strictEqual(Model.cellularIcon(38, "ok"), String.fromCodePoint(0xF08F4))
assert.strictEqual(Model.cellularIcon(80, "ok"), String.fromCodePoint(0xF08FA))
assert.strictEqual(Model.cellularIcon(0, "off"), String.fromCodePoint(0xF08FC))
assert.strictEqual(Model.cellularIcon(38, "disconnected"), String.fromCodePoint(0xF08FE))
pass("labels and icons")

// Radio policy is independent from both the bearer and modem power state.
for (const [raw, expected] of [["enabled", true], ["disabled", false], ["", null], ["unavailable", null]]) {
  const parsed = Model.parseStatus("===MODEM===\nmodem.generic.state : disabled\n===WWAN===\n" + raw + "\n")
  assert.strictEqual(parsed.radioEnabled, expected)
}
assert.strictEqual(Model.parseStatus("===WWAN===\n enabled \n===NM===\n").radioEnabled, true)
const staleBearer = Model.parseStatus("===MODEM===\nmodem.generic.state : connected\n===WWAN===\ndisabled\n")
assert.strictEqual(staleBearer.radioEnabled, false)
pass("radio enabled, disabled, unavailable and transitional modem states")

// Execute the generated argv against a stub: only the WWAN radio may change,
// and command failures must reach the service's existing error handler.
const fs = require("fs")
const os = require("os")
const path = require("path")
const cp = require("child_process")
const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "wwan-radio-test-"))
try {
  fs.writeFileSync(path.join(stubDir, "nmcli"), '#!/bin/sh\nprintf "%s\\n" "$@"\nexit "${WWAN_TEST_EXIT:-0}"\n', {mode: 0o700})
  for (const enabled of [true, false]) {
    const argv = Model.radioCommand(enabled)
    const result = cp.spawnSync(argv[0], argv.slice(1), {encoding: "utf8", env: {...process.env, PATH: stubDir}})
    assert.strictEqual(result.status, 0)
    assert.deepStrictEqual(result.stdout.trim().split("\n"), ["radio", "wwan", enabled ? "on" : "off"])
  }
  const argv = Model.radioCommand(false)
  const failure = cp.spawnSync(argv[0], argv.slice(1), {env: {...process.env, PATH: stubDir, WWAN_TEST_EXIT: "10"}})
  assert.strictEqual(failure.status, 10)
} finally {
  fs.rmSync(stubDir, {recursive: true})
}
pass("radio actions target WWAN only and preserve failure exit codes")

console.log("all tests passed")

for (const [signal, code] of [[0,0xF08FE],[19,0xF08FE],[20,0xF08F4],[39,0xF08F4],[40,0xF08F6],[46,0xF08F6],[59,0xF08F6],[60,0xF08F8],[79,0xF08F8],[80,0xF08FA],[100,0xF08FA]]) {
  assert.strictEqual(Model.cellularIcon(signal,"ok"),String.fromCodePoint(code));
}
pass("signal levels never use alert glyphs");

// Counters must follow the cellular IP interface, including MBIM child devices.
assert.strictEqual(Model.ipInterface('GENERAL.DEVICE:wlan0\nGENERAL.IP-IFACE:wlan0\nGENERAL.DEVICE:cdc-wdm0\nGENERAL.IP-IFACE:wwan0mbim0', 'cdc-wdm0'), 'wwan0mbim0')
assert.strictEqual(Model.ipInterface('GENERAL.DEVICE:cdc-wdm0\nGENERAL.IP-IFACE:../../bad', 'cdc-wdm0'), '')
function counters(rx, tx) { return ' wwan0mbim0: ' + rx + ' 0 0 0 0 0 0 0 ' + tx + ' 0 0 0 0 0 0 0' }
var first = Model.transferSample(counters(1000, 500), 'wwan0mbim0', 1000, null)
assert.strictEqual(first.rxRate, -1)
var second = Model.transferSample(counters(4000, 1500), 'wwan0mbim0', 3000, first)
assert.strictEqual(second.rxRate, 1500)
assert.strictEqual(second.txRate, 500)
assert.strictEqual(Model.transferSample(counters(1, 1), 'wwan0mbim0', 4000, second).rxRate, -1)
assert.strictEqual(Model.transferSample(counters(5000, 2000), 'wwan0mbim0', 30000, second).rxRate, -1)
assert.strictEqual(Model.transferSample(counters(5000, 2000), 'wlan0', 4000, second), null)
assert.strictEqual(Model.transferSample('wwan0mbim0: broken', 'wwan0mbim0', 4000, second), null)
console.log('ok - cellular interface resolution, rates, resets, missing counters and stale samples')
var smooth = Model.transferSample(counters(4000, 1500), 'wwan0mbim0', 4000, second)
assert.strictEqual(smooth.rxRate, 1000) // 3000 bytes / 3 seconds, including idle interval
assert.strictEqual(smooth.txRate, 1000 / 3)
for (var tick = 5; tick <= 10; tick++) smooth = Model.transferSample(counters(4000, 1500), 'wwan0mbim0', tick * 1000, smooth)
assert.strictEqual(smooth.rxRate, 0) // old burst leaves rolling window
assert.strictEqual(smooth.intervals.length, 5)
assert.strictEqual(Model.transferSample(counters(0, 0), 'wwan0mbim0', 11000, smooth).intervals.length, 0)
console.log('ok - time-weighted rolling rates, bounded window and history reset')
