# Validation of the combined WWAN update

Validated on 2026-10-25 with the installed Omarchy 4.5 components, and shell components downloaded from the official omacom/omarchy v4.0.0 and v4.0.4 tags.

- `node test-model.js`: modem/profile state parsing, Wi-Fi owning the default route, PIN/FDN handling, generated connect/disconnect and radio commands, failure exit codes, and icon thresholds including 46% without alert glyphs.
- `node tests/test-locale.js`: locale normalization, LC_ALL > LC_MESSAGES > LANG > Qt precedence, regional codes, Chinese mapping, C/POSIX and invalid input.
- `python3 -m unittest discover -s tests -v`: all 13 catalogs have the same keys, nonempty values and matching placeholders; literal UI translation keys exist.
- `omarchy plugin validate .`: plugin manifest validation.
- `bash tests/run-qml.sh`: production panel and service with simulated mmcli/nmcli/ip only. Native live switching through all supported languages, regional and English fallbacks, RTL restoration, German number formatting, radio state, state/IPC identifier preservation and markup-shaped external text in plain-text sinks.
- The same QML test with `PLUGIN_TEST_SHELL` pointing at each official legacy shell: dynamic native-component failure correctly selects the environment-based translator. Number formatting and translated state/error rendering work without Commons.I18n or Commons.Translations.
- German and Arabic production-panel previews inspected visually with a simulated connected modem. RTL reverses controls, translated radio help wraps, and profile/provider strings remain literal.

To use old source on current Qt, `tests/prepare-legacy-fixture.py` copies the source and qualifies Commons.Color references to avoid a newer Qt Color type collision. It changes no installed files and does not replace the old component APIs.

These are component compatibility tests with the current Qt/Quickshell runtime, **not complete tests of old desktop/OS installations**, modem hardware, carrier authentication or real network switching. Language catalogs still benefit from native-speaker review.

The installed plugin and existing worktrees were left unchanged. The combined changes are developed in a separate worktree/branch; the radio work and existing localization implementation are preserved.

## Transfer statistics and route feedback (2026-10-25)

- Model tests cover cellular IP interface selection (including MBIM control/data
  interface differences), missing/malformed counters, interface resets, stale
  samples, and the five-interval time-weighted rolling average including idle
  traffic and expiry of old bursts.
- Current-shell QML tests also cover interface discovery, localized transfer
  formatting, the prominent internet-route header and both route-row states.
- Linux counters were read on the host's connected `wwan0` interface. No extra
  network probes or traffic-generating speed tests are added.
- Rates poll once per second only while the connected panel is open. Totals
  reflect the interface lifetime; route feedback follows the existing route
  lookup to 1.1.1.1 and can differ for VPN/destination-specific routes.
- New statistics/route strings are translated in English and German; the
  other eleven catalogs currently use English for these additions.
- The bar keeps its existing signal icon without an additional route badge.

The prior legacy-component compatibility results above apply to the original
localization/radio update; the added statistics UI was checked on the current
installed shell.
