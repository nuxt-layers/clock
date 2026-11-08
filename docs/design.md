# Clock — Design

> **In short:** a headless Foundation capability, depending on no other capability, offering consistent, explicit temporal semantics across Nuxt applications, Nitro and browsers.

## Purpose and classification

`clock` owns application-wide date/time conventions and a replaceable clock provider, together with parsing, formatting, conversion, validation and arithmetic. This justifies **Foundation** rather than a stateless Library, although its computational core must remain pure TypeScript and reusable without Nuxt.

## Boundaries

| Owns | Does not own |
|---|---|
| Date/time types and canonical encodings | Domain events or booking schedules |
| Validation and strict parsing | Database, cookies or local storage |
| Locale-aware formatting | User, tenant or profile records |
| UTC instant and IANA time-zone conversion | Authentication or access policy |
| Calendar arithmetic and elapsed durations | Notifications or task execution |
| Injectable clock and Nuxt/Nitro access | NTP synchronisation or authoritative external time |
| SSR-safe presentation defaults | UI components, pages or styles |
| Explicit numeric patterns and their validation | Selecting or storing users' preferred patterns |

No dependency on another ecosystem capability is required. The host may supply locale and time-zone preferences sourced from elsewhere but `clock` never queries those capabilities.

## Semantics

1. Distinguish instants, dates, times, local date/times and zoned date/times. Never infer missing information.
2. Persist/transport canonical validated values; localised display strings are output only.
3. Use IANA time zones, not fixed offsets, for civil-time rules. Preserve the distinction between calendar arithmetic and elapsed time.
4. Reject ambiguous or nonexistent local time by default; provide an explicit resolution policy.
5. Format using `Intl`; use the runtime's native Temporal internally. No Temporal types leak into the public contract.
6. Use server time for trusted decisions. Device time is suitable for display and local interactions, not enforcing security or deadlines.
7. Avoid hydration differences: SSR uses stable host-specified locale and zone; any browser-resolved preference is introduced deliberately.
8. Patterns are explicit and strict: fixed-width or explicitly unpadded numeric tokens, English month and weekday names and a 12-hour clock with `am`/`pm`, optional seconds (read as zero), quoted alphabetic literals, `yy` only with a stated century and never a sliding pivot. Names are English so a pattern means the same in every locale; localised names come only from `format`. Lossless patterns round-trip; patterns that omit or truncate fields are presentation-only.
9. Preferences belong to the host. Configuration, when installed, owns selectable preferences, their scope and precedence; the host passes effective values into Clock as plain data. Clock remains the only interpreter of pattern syntax and never queries Configuration.

## Architecture

- **Core:** side-effect-free TypeScript parser, formatter, validator and converter, with a clock-provider interface (`shared/core.ts`), and the pattern grammar (`shared/pattern.ts`). It loads no runtime packages: `@js-temporal/polyfill` is a dependency for its TypeScript type definitions only, and is never loaded or bundled.
- **Nuxt integration:** `runtimeConfig.public.clock` defaults, `useClock()` and SSR-stable client configuration; no global mutable per-user settings. A plugin validates the defaults when the app initialises, on server and client, so invalid settings fail before rendering or hydration.
- **Nitro integration:** `@nuxt-layers/clock/server` exposes `useServerClock()` to Nitro request handlers, with a fresh clock instance and optional injected provider.
- **No presentation:** consumers build their own UI or use a separate UI capability.
- **No persistence:** Clock creates no storage, so no storage register is required.

## Public contract and composition

`CONTRACT.md` is the sole consumer handover; it must stay accurate and independently sufficient. `capability.json` declares `@nuxt-layers/clock`, class `foundation`, the provided Clock capability and no required capabilities. Integrate with the existing ADR-0012 `now()` port without changing that ecosystem-wide shape.

The Nuxt host composition must fit ADR-0012's 50-line budget, including configuration; CI enforces it. The minimal host exercises client and server use, and mocks resolved preferences instead of installing Configuration.

## Acceptance criteria

- Strict round trips for every canonical temporal kind and documented precision.
- Unit tests for leap years, invalid dates, DST gaps/overlaps, zones and locale/hours.
- No server/client hydration mismatch at default configuration.
- Config validation and explicit per-call preference overrides.
- Fixed-clock deterministic tests with request isolation.
- Pure core importable without Nuxt; no runtime database, network or storage requirement.
- Server-side and browser-side consumer tests using only `CONTRACT.md`.
- No public export outside documented entry points; code and contract reconciled before acceptance.
- Lossless patterns, including names, unpadded fields and the 12-hour clock, round-trip; parsed weekdays must agree with the date; malformed or incompatible patterns fail with `CLOCK_INVALID_PATTERN`; `yy` without a valid century fails with `CLOCK_INVALID_CONFIG`.
- Mocked host preferences (defaults, overrides and invalid values) render identically in SSR and after hydration.

## Interface decisions

- Canonical fractional seconds use 0–9 digits, preserving parsed precision. `now()` defaults to milliseconds.
- Arithmetic uses distinct calendar versus elapsed-time units, with no mixed operation; calendar end-of-month overflow clamps and DST ambiguity rejects by default.
- Public entry points are `/core` for portable utilities, `/server` for Nitro and `useClock()` for Nuxt; the root is the Nuxt layer entry.
- Public failures expose a stable `ClockError` shape. `isValid` returns a boolean instead of throwing for invalid user input.

## Runtime compatibility

| Runtime | Supported | Tested in CI |
|---|---|---|
| Node.js | 26.13 and later 26.x, as `package.json` `engines` states | Core tests, typecheck, minimal host tests, build and typecheck on 26.13.0 and the latest 26.x |
| Browsers | Current Chromium, Firefox and WebKit | The built minimal host hydrates in each, with the browser set to `America/New_York` and `fr-FR` |

The browser check renders a fixed set of Clock results on the server (nanosecond arithmetic, DST gaps and overlaps, a +14:00 zone, a leap day, patterns with names and the 12-hour clock, and interchange formats), then requires each browser to produce the same results during hydration, with no mismatch. Localised `format` output is excluded, because `Intl` wording may legitimately differ between engines. Results never depend on the browser's own time zone or locale.

Other runtimes, such as Bun, Deno and edge workers, are not supported until added to this table and to CI.

### Native Temporal

Clock uses the runtime's native `Temporal`, through one internal file, `shared/temporal.ts`. CI showed native `Temporal` on Node.js 26.13.0 and in Chromium 153, Firefox 155 and WebKit 26.6, so every supported runtime has it; the CI logs keep reporting it. On a runtime without it, importing Clock fails at once with an error naming the supported runtimes, rather than misbehaving later.

`@js-temporal/polyfill` remains a dependency only for its TypeScript type definitions, which follow the same specification, because TypeScript does not yet ship Temporal types and consumers typecheck Clock's source. It is imported with `import type`, so none of its code runs or reaches a bundle. Replacing it with TypeScript's own types, once they exist, changes only `shared/temporal.ts`.

The move was gated on every suite and the browser check passing unchanged, which they did.

### Time-zone data and precision

`tests/runtime-assumptions.test.ts` checks the assumptions the contract documents: IANA time-zone data of release 2024b or later (using rule changes from 2023 to 2024b in Kazakhstan, Paraguay and Greenland, plus London, São Paulo, +14:00, +05:45 and Lord Howe's half-hour daylight saving), zone names kept as given, nanosecond precision through every operation, millisecond system-clock reads and the 0001–9999 year range. The browser check repeats the newest rule changes in every browser.
