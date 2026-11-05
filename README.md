# clock

> **In short:** a headless Nuxt foundation for consistent date, time, time-zone and localisation operations on the server and in the browser.

`clock` is being designed. It is not yet an installable capability.

- [Consumer contract](CONTRACT.md) — proposed public integration surface; not yet implemented.
- [Design](docs/design.md) — capability decisions and boundaries.
- [Plan](PLAN.md) — implementation and acceptance work.
- [Resources](RESOURCES.md) — governing architecture at a verified revision.

The layer will use a pure TypeScript core with thin Nuxt and Nitro integration. It will own neither application data nor persistence.
