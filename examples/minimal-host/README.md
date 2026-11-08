# Minimal Clock host

> **In short:** the smallest Nuxt consumer proving the public Clock contract in the app, in Nitro and in every supported browser.

Run from this directory with pnpm: `pnpm install`, `pnpm test`, `pnpm build`, `pnpm typecheck`, then `pnpm test:browsers chromium firefox webkit` after `pnpm exec playwright install chromium firefox webkit`. The host has its own dependency graph and prepares Nuxt before starting Vitest. It uses only the documented package entries and the public composable.

- `app/app.vue` uses the auto-imported `useClock()` and a host-owned mocked Configuration response to format a fixed date. It also renders a runtime probe: fixed Clock results computed during SSR and again during hydration, covering nanosecond arithmetic, DST gaps and overlaps, recent time-zone rules, patterns and interchange formats.
- `server/api/clock.get.ts` uses the public server entry and the same mock preferences. The Clock layer registers no HTTP routes.
- `shared/mock-configuration.ts` models authorised effective settings without importing Configuration; the tests cover default preferences, scoped overrides and invalid values. Only the host selects a viewer's settings, and no account data is stored in public runtime configuration.
- `runtimeConfig.public.clock` sets shared locale and time-zone defaults.
- `tests/clock.e2e.test.ts` checks SSR, the Nitro route and the mocked preferences.
- `tests/browsers.mjs` serves the built host and requires each browser, set to a different time zone and locale, to hydrate with exactly the server's probe results and no mismatch.
