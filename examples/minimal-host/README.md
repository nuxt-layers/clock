# Minimal Clock host

> **In short:** the smallest Nuxt consumer proving the public Clock contract in the app and Nitro.

Run from this directory with pnpm after installing dependencies: `pnpm install`, `pnpm test`, `pnpm build`, then `pnpm typecheck`. The host has its own development dependency graph and explicitly prepares Nuxt before starting Vitest. The root test command runs only the independent core tests. The Nuxt host uses only the documented package entry and public composable.

- `app/app.vue` uses the auto-imported `useClock()` and formats a fixed date to avoid hydration drift.
- `server/api/clock.get.ts` uses the public server entry and exposes a sample host-owned route. The Clock layer itself registers no HTTP routes.
- `runtimeConfig.public.clock` sets shared locale and time-zone defaults.

This example is not yet accepted until build, route and SSR checks pass in CI or locally.
