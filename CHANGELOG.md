# Changelog

> **In short:** material design and contract changes, newest first.

## 2026-11-05

- Accepted the development consumer integration after successful local and Git-backed CI tests, frozen installs, production builds, typechecks and composition-budget verification.
- Hardened public error handling and temporal edge cases, including injected providers, DST policies, year limits and nanosecond precision.

- Added Nuxt 4 layer configuration, a `useClock()` composable, explicit Nitro `useServerClock()` export and minimal consumer/acceptance tests.
- Began implementing the pure TypeScript clock core with strict parsing, time zones, DST resolution, arithmetic and contract tests; subsequent Nuxt/Nitro integration completed.
- Refined the proposed public contract: precision, strict parsing, arithmetic, DST policy, error shape and export paths. Implementation followed in subsequent changes.
- Drafted the proposed Clock Foundation design and standalone consumer contract. No implementation or release exists.
