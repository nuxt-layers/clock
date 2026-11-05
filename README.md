# clock

> **In short:** a headless Nuxt foundation for consistent date, time, time-zone and localisation operations on the server and in the browser.

`clock` has a pure TypeScript core and a Nuxt/Nitro integration implementation. The integration remains unverified until dependency resolution, contract tests and minimal-host acceptance pass.

- [Consumer contract](CONTRACT.md) — public integration surface; the proposed consumer interface, with integration awaiting acceptance.
- [Design](docs/design.md) — capability decisions and boundaries.
- [Plan](PLAN.md) — implementation and acceptance work.
- [Resources](RESOURCES.md) — governing architecture at a verified revision.

The layer uses a pure TypeScript core with thin Nuxt and Nitro integration. It will own neither application data nor persistence.
