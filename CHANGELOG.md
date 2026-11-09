# Changelog

> **In short:** material design and contract changes, newest first.

## 2026-11-09

- `ClockError` and `ClockErrorCode` are exported from `@nuxt-layers/clock/server` as well as `/core`, as the same class; the contract lists exactly what each entry point exports (nuxt-layers/clock#25).
- Added `isValidTimeZone` and `timeZones` on `/core`, `/server` and every clock instance. Zone names must now match letter case exactly (`europe/london` is rejected with `CLOCK_INVALID_TIME_ZONE`, where it was previously accepted); `UTC`, `Etc/*` and links remain valid. `timeZones()` comes from a fixed list of IANA primary zones (tzdata 2026e) rather than the engine's, because V8 and Firefox/WebKit spell renamed zones differently; the browser check compares the list with the server's (nuxt-layers/clock#27).
- Contract: recommended deadline arithmetic across daylight saving (calendar units on a zoned value in a caller-stated zone with `compatible` disambiguation), with tests across the Europe/London changes (nuxt-layers/clock#26).

## 2026-11-08

- Audit fixes: architecture rules re-pinned to the revision with ADR-0012 §2a and the ADR-0013 TypeScript baseline; supported Node.js stated as 26.13 or later, matching `engines`; minimal host README describes the browser check and drops a stale status line; `pnpm test` runs every file in `tests/`.
- README: protocol date formats added to what Clock owns, matching the architecture-rules catalogue.
- Runtime assumptions are tested: IANA time-zone data 2024b or later, zone names kept as given, nanosecond precision, millisecond system-clock reads and the year range (`tests/runtime-assumptions.test.ts`); the browser check covers the newest zone rules. All planned work is complete, so `PLAN.md` is removed.
- Clock uses native Temporal on every supported runtime and no longer depends on `@js-temporal/polyfill`; types come from TypeScript 6.0.3's `esnext.temporal` library. TypeScript is 6.0.3 and `vue-tsc` 3.3.14 in Clock and the minimal host; TypeScript 7 is not used because `vue-tsc` and `nuxt typecheck` need its JavaScript API, which 7 does not have yet. The minimal host's server output shrank from 3.77 MB to 3.4 MB. Results are unchanged: all tests and the browser check pass as before.
- CI: `actions/checkout` v7.0.1 and `actions/setup-node` v7.1.0, pinned by commit, replacing versions that ran on the deprecated Node.js 20 Actions runtime.
- Runtime compatibility: supported runtimes are Node.js 26.13+ (26.x) and current Chromium, Firefox and WebKit. CI tests both Node versions and checks that each browser hydrates the minimal host with exactly the server's Clock results. The polyfill is reached through `shared/temporal.ts`, and the design records when and how to move to native Temporal.
- Contract checked against the code: purity of `parseInterchange`, system-clock exports from `/core`, `format` defaults, pattern and interchange input limits, and fixed table formatting.
- Pattern grammar: unpadded `d`, `M` and `H`; English month (`MMM`, `MMMM`) and weekday (`EEE`, `EEEE`) names read in any letter case, with weekdays checked against the date; 12-hour `hh` and `h` with `am`/`pm`. `dd/MMM/yyyy`, previously invalid, is now valid. Seconds are optional in time patterns: `h:mm a` reads `5:30 pm` as `17:30:00`.
- Added `parseInterchange` and `formatInterchange` for RFC 3339, JWT NumericDate, epoch milliseconds, HTTP-date (including the obsolete forms), RFC 5322, ISO 8601 basic, and X.509 UTCTime and GeneralizedTime, with tests from each standard.
- Design brought up to date with the accepted pattern and preference work; open runtime and time-zone questions moved to a restored `PLAN.md`.
- Contract: proposed interchange formats for protocol dates (RFC 3339, JWT NumericDate, epoch milliseconds, HTTP-date, RFC 5322, ISO 8601 basic, X.509 UTCTime and GeneralizedTime) and proposed pattern additions for common human formats.
- README: responsibility and exclusions, provided and required capabilities, development commands, security and privacy, and links to every repository document.
- Resources: architecture rules re-pinned to the revision with Layer Standard §5.
- All planned work is complete, so `PLAN.md` is removed.
- Contract: pattern operations and the host-side preference pattern are described as accepted, not proposed; the public `ClockSettings`, `PatternKind`, `PatternOptions`, `ClockErrorCode` and `ClockError` types are listed; configuration validation is stated to run at app initialisation on server and client.

## 2026-11-06

- Added strict, explicit pattern formatting and parsing (`yyyy`, `yy` with an explicit century, `MM`, `dd`, `HH`, `mm`, `ss`, fractional seconds and quoted literals), with no pattern detection, rollover or inferred zones.
- Specified optional host-supplied presentation preferences from Configuration: Clock interprets and validates them but never queries Configuration; consumer tests use mocked resolved settings.

## 2026-11-05

- Accepted the development consumer integration after successful local and Git-backed CI tests, frozen installs, production builds, typechecks and composition-budget verification.
- Hardened public error handling and temporal edge cases, including injected providers, DST policies, year limits and nanosecond precision.

- Added Nuxt 4 layer configuration, a `useClock()` composable, explicit Nitro `useServerClock()` export and minimal consumer/acceptance tests.
- Began implementing the pure TypeScript clock core with strict parsing, time zones, DST resolution, arithmetic and contract tests; subsequent Nuxt/Nitro integration completed.
- Refined the proposed public contract: precision, strict parsing, arithmetic, DST policy, error shape and export paths. Implementation followed in subsequent changes.
- Drafted the proposed Clock Foundation design and standalone consumer contract. No implementation or release exists.
