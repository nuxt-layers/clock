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
5. Format using `Intl`; use Temporal semantics internally, with a compatible implementation for unsupported runtimes. No Temporal implementation types leak into the public contract.
6. Use server time for trusted decisions. Device time is suitable for display and local interactions, not enforcing security or deadlines.
7. Avoid hydration differences: SSR uses stable host-specified locale and zone; any browser-resolved preference is introduced deliberately.
8. Patterns are explicit and strict: fixed-width or explicitly unpadded numeric tokens, English month and weekday names and a 12-hour clock with `am`/`pm`, quoted alphabetic literals, `yy` only with a stated century and never a sliding pivot. Names are English so a pattern means the same in every locale; localised names come only from `format`. Lossless patterns round-trip; patterns that omit or truncate fields are presentation-only.
9. Preferences belong to the host. Configuration, when installed, owns selectable preferences, their scope and precedence; the host passes effective values into Clock as plain data. Clock remains the only interpreter of pattern syntax and never queries Configuration.

## Architecture

- **Core:** side-effect-free TypeScript parser, formatter, validator and converter, with a clock-provider interface (`shared/core.ts`), and the pattern grammar (`shared/pattern.ts`). Its only package dependency is `@js-temporal/polyfill`.
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

## Open questions

Runtime compatibility across environments and the move from `@js-temporal/polyfill` to native Temporal, and cross-environment time-zone data and precision, are tracked in [the plan](../PLAN.md). Until settled, Clock supports the Node.js version in `package.json` `engines`, and zone rules come from the runtime.
