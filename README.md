# clock

> **In short:** a headless Nuxt foundation for consistent date, time, time-zone and localisation operations on the server and in the browser.

`clock` is a Foundation capability: a pure TypeScript temporal core with thin Nuxt and Nitro integration. Applications compose it with `extends`, with no storage, IAM or presentation dependencies.

## Responsibility

**Owns:** canonical date/time values, strict parsing, explicit-pattern formatting and parsing, protocol date formats (RFC 3339, JWT `NumericDate`, epoch milliseconds, HTTP-date, RFC 5322 email dates, ISO 8601 basic, and X.509 `UTCTime` and `GeneralizedTime`), localisation, IANA time-zone conversion, DST resolution, calendar arithmetic and an injectable clock.

**Does not own:**

- user or tenant preferences: the host resolves them (for example from Configuration) and passes them in; Clock never queries another capability;
- persistence: it writes no databases, cookies or browser storage, so it has no storage register;
- screens: it provides no pages, components or theme handling;
- HTTP routes, events or schemas.

## Provides and requires

- **Provides:** `Clock`.
- **Requires:** no other capability.

[`capability.json`](capability.json) records both, with contract versions.

## Documents

- [Consumer contract](CONTRACT.md): the complete public integration interface, settings, errors and headless surface.
- [Design](docs/design.md): capability decisions and boundaries.
- [Minimal host](examples/minimal-host): a working consumer, used in acceptance tests.
- [Changelog](CHANGELOG.md): material changes, newest first.
- [Resources](RESOURCES.md): the governing architecture reviewed.

## Working on it

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
node scripts/check-composition.mjs
pnpm --dir examples/minimal-host install --frozen-lockfile
pnpm --dir examples/minimal-host test
pnpm --dir examples/minimal-host build
pnpm --dir examples/minimal-host typecheck
pnpm --dir examples/minimal-host exec playwright install chromium firefox webkit
pnpm --dir examples/minimal-host test:browsers chromium firefox webkit
```

The Quality workflow runs the same checks on every pull request, on each supported Node.js version and browser, and also tests an independent Git-backed consumer of the accepted `master`.

## Security and privacy

Clock processes no personal data and needs no permissions, secrets or network access. Browser time can be adjusted by the user, so access, expiry and deadline decisions must use server time; see [the contract](CONTRACT.md#permissions).
