# clock

> **In short:** a headless Nuxt foundation for consistent date, time, time-zone and localisation operations on the server and in the browser.

`clock` provides a pure TypeScript temporal core and thin Nuxt/Nitro integration. Applications can compose it without storage, IAM or presentation dependencies.

- [Consumer contract](CONTRACT.md) — public integration surface; the self-contained public integration interface.
- [Design](docs/design.md) — capability decisions and boundaries.
- [Resources](RESOURCES.md) — governing architecture at a verified revision.

The layer uses a pure TypeScript core with thin Nuxt and Nitro integration. It will own neither application data nor persistence.
