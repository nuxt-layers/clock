# Minimal Clock host

> **In short:** the smallest Nuxt consumer proving the public Clock contract in the app and Nitro.

Run from this directory with pnpm after installing dependencies: `pnpm install`, `pnpm test`, `pnpm build`, then `pnpm typecheck`. The host has its own development dependency graph and explicitly prepares Nuxt before starting Vitest. The root test command runs only the independent core tests. The Nuxt host uses only the documented package entry and public composable.

- `app/app.vue` uses the auto-imported `useClock()` and a host-owned mocked Configuration response to format a fixed date, preserving SSR/hydration consistency.
- `server/api/clock.get.ts` uses the public server entry and the same mock preference contract. The Clock layer registers no HTTP routes.
- `runtimeConfig.public.clock` sets shared locale and time-zone defaults.

- `shared/mock-configuration.ts` models authorised effective settings without importing Configuration; integration tests cover default preferences, scoped overrides and invalid values. Only the host selects a viewer's settings, and no account data is stored in public runtime configuration.

The new pattern integration requires CI and local acceptance before merge.
