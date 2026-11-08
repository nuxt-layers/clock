# Changelog

> **In short:** material design and contract changes, newest first.

## 2026-11-08

- All planned work is complete, so `PLAN.md` is removed.

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
