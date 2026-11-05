# Clock — Design

> **In short:** a dependency-free, headless Foundation capability offering consistent, explicit temporal semantics across Nuxt applications, Nitro and browsers.

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

No dependency on another ecosystem capability is required. The host may supply locale and time-zone preferences sourced from elsewhere but `clock` never queries those capabilities.

## Semantics

1. Distinguish instants, dates, times, local date/times and zoned date/times. Never infer missing information.
2. Persist/transport canonical validated values; localised display strings are output only.
3. Use IANA time zones, not fixed offsets, for civil-time rules. Preserve the distinction between calendar arithmetic and elapsed time.
4. Reject ambiguous or nonexistent local time by default; provide an explicit resolution policy.
5. Format using `Intl`; use Temporal semantics internally, with a compatible implementation for unsupported runtimes. No Temporal implementation types leak into the public contract.
6. Use server time for trusted decisions. Device time is suitable for display and local interactions, not enforcing security or deadlines.
7. Avoid hydration differences: SSR uses stable host-specified locale and zone; any browser-resolved preference is introduced deliberately.

## Architecture

- **Core:** side-effect-free TypeScript parser, formatter, validator and converter, with a clock-provider interface.
- **Nuxt integration:** configuration validation, `useClock()` and SSR context integration; no global mutable per-user settings.
- **Nitro integration:** request-safe server-side access to the same service and optional injected clock.
- **No presentation:** consumers build their own UI or use a separate UI capability.
- **No persistence:** no storage register is required unless implementation introduces or causes actual storage.

## Public contract and composition

`CONTRACT.md` is the sole consumer handover; it must be accurate and independently sufficient once implemented. `capability.json` will declare `@nuxt-layers/clock`, class `foundation`, the provided Clock capability and no required capabilities. Integrate with the existing ADR-0012 `now()` port without changing that ecosystem-wide shape.

The planned Nuxt host composition must fit ADR-0012's 50-line budget, including configuration. The minimal host must exercise client and server use.

## Acceptance criteria

- Strict round trips for every canonical temporal kind and documented precision.
- Unit tests for leap years, invalid dates, DST gaps/overlaps, zones and locale/hours.
- No server/client hydration mismatch at default configuration.
- Config validation and explicit per-call preference overrides.
- Fixed-clock deterministic tests with request isolation.
- Pure core importable without Nuxt; no runtime database, network or storage requirement.
- Server-side and browser-side consumer tests using only `CONTRACT.md`.
- No public export outside documented entry points; code and contract reconciled before acceptance.

## Interface decisions

- Canonical fractional seconds use 0–9 digits, preserving parsed precision. `now()` defaults to milliseconds.
- Arithmetic uses distinct calendar versus elapsed-time units, with no mixed operation; calendar end-of-month overflow clamps and DST ambiguity rejects by default.
- Public entry points are `/core` for portable utilities, `/server` for Nitro and `useClock()` for Nuxt; the root is the Nuxt layer entry.
- Public failures expose a stable `ClockError` shape. `isValid` returns a boolean instead of throwing for invalid user input.

## Implementation checks still required

1. Prove the source core export map and request-scoped injected clock in minimal Nuxt/Nitro hosts.
2. Verify the runtime compatibility matrix for the initial `@js-temporal/polyfill` implementation and any native Temporal transition.
3. Validate time-zone data assumptions and cross-environment precision in contract tests.

These are implementation gates, not reasons to expand the architecture-rules repository.
