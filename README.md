# clock

> **In short:** a headless Nuxt foundation for consistent date, time, time-zone and localisation operations on the server and in the browser.

`clock` has a partial pure TypeScript core implementation. It is not yet an installable Nuxt capability; the Nuxt/Nitro integration is outstanding.

- [Consumer contract](CONTRACT.md) — public integration surface; core partially implemented.
- [Design](docs/design.md) — capability decisions and boundaries.
- [Plan](PLAN.md) — implementation and acceptance work.
- [Resources](RESOURCES.md) — governing architecture at a verified revision.

The layer will use a pure TypeScript core with thin Nuxt and Nitro integration. It will own neither application data nor persistence.
