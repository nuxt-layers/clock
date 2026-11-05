# Changelog

> **In short:** material design and contract changes, newest first.

## 2026-11-05

- Added Nuxt 4 layer configuration, a `useClock()` composable, explicit Nitro `useServerClock()` export and minimal consumer/acceptance tests (pending validation).
- Began implementing the pure TypeScript clock core with strict parsing, time zones, DST resolution, arithmetic and contract tests; Nuxt/Nitro integration remains outstanding.
- Refined the proposed public contract: precision, strict parsing, arithmetic, DST policy, error shape and export paths. No implementation exists.
- Drafted the proposed Clock Foundation design and standalone consumer contract. No implementation or release exists.
