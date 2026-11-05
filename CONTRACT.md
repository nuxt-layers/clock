# Clock — Consumer Contract

> **In short:** a single typed date/time interface for Nuxt server and browser code, with explicit temporal types, time zones and deterministic testing.

**Status:** Design proposal; not implemented or available for consumption. Every signature and configuration item below is proposed, not an existing export. Acceptance requires implemented exports and contract tests.

## Install

Planned package: `@nuxt-layers/clock` (Git-backed dependency tracking the latest accepted `master` during development). **Do not install yet.**

Proposed Nuxt configuration:

```ts
export default defineNuxtConfig({
  extends: ['@nuxt-layers/clock'],
  clock: {
    locale: 'en-GB',
    timeZone: 'UTC',
    hourCycle: 'h23',
  },
})
```

The host must not write adapters or register an HTTP endpoint. Server and client entry points are listed below; actual import paths will be confirmed against implementation before this contract is accepted.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `clock.locale` | `en-GB` | BCP 47 locale used when formatting without an override |
| `clock.timeZone` | `UTC` | IANA time zone for calendar operations and default presentation |
| `clock.hourCycle` | `h23` | Hour-cycle preference for localised output (`h11`, `h12`, `h23`, `h24`) |

A caller may override locale, time zone and hour cycle per operation. Invalid configuration fails at start-up with `CLOCK_INVALID_CONFIG`. No environment variables, secrets or network services are required.

The host resolves user preferences, when available, and passes them as explicit overrides. The layer never looks up identity, profile or tenant records. Browser time-zone detection must be an explicit opt-in at the presentation boundary; it cannot silently change SSR output.

## Host passes

Nothing is required. The default clock uses the system clock.

For deterministic tests or trusted host integration, a host may supply the existing ADR-0012 structural clock port:

```ts
type ClockPort = { now(): string } // this layer returns UTC ISO 8601, e.g. 2026-11-05T14:30:00.000Z
```

`now()` is synchronous and returns a valid instant. It is scoped per application/server request or test invocation, never a mutable global shared across requests. This port's call shape remains `now()`; the return-value definition here is proposed for this capability and must not be presumed to constrain other existing consumers.

## Client and server functions

**Proposed public entry points:** `@nuxt-layers/clock/core` (pure, environment-neutral TypeScript functions), `@nuxt-layers/clock/server` (Nitro-safe server functions) and auto-imported `useClock()` (Nuxt composable, usable in a Nuxt app including SSR). The package root `@nuxt-layers/clock` is the Nuxt layer entry used by `extends`; it is not the portable utility entry. The same documented operation names and types apply to each context, and no consumer imports private files. These paths are part of the proposed contract and must be implemented exactly or revised before acceptance.

Canonical value types are strings, not JavaScript `Date` objects:

```ts
type Instant = string        // ISO 8601 UTC with Z, exact point in time
type CalendarDate = string   // YYYY-MM-DD, no zone
type ClockTime = string      // HH:mm:ss[.fraction], no zone
type LocalDateTime = string  // YYYY-MM-DDTHH:mm:ss[.fraction], no zone
type ZonedDateTime = string  // ISO offset + [IANA/Zone], e.g. 2026-11-05T14:30:00+00:00[Europe/London]
type TemporalKind = 'instant' | 'date' | 'time' | 'localDateTime' | 'zonedDateTime'
type Value = { kind: TemporalKind; value: string }
type DisplayOptions = {
  locale?: string
  timeZone?: string
  hourCycle?: 'h11' | 'h12' | 'h23' | 'h24'
  dateStyle?: 'full' | 'long' | 'medium' | 'short'
  timeStyle?: 'full' | 'long' | 'medium' | 'short'
}
type Disambiguation = 'reject' | 'earlier' | 'later' | 'compatible'
type DateUnits = { years?: number; months?: number; weeks?: number; days?: number }
type TimeUnits = { hours?: number; minutes?: number; seconds?: number }
type ArithmeticOptions = { disambiguation?: Disambiguation }
```

Proposed operations, exposed through the same semantic service on client and server:

| Operation | Signature | Behaviour |
|---|---|---|
| Current instant | `now(): Instant` | Reads injected clock or system clock; server is authoritative for security-sensitive uses |
| Calendar date | `today(timeZone?: string): CalendarDate` | Current date in the stated/default zone |
| Strict parsing | `parse(kind: TemporalKind, input: string): Value` | Accepts documented canonical formats only; rejects ambiguity |
| Formatting | `format(value: Value, options?: DisplayOptions): string` | Locale-aware human-readable output, never for persistence |
| Zone conversion | `toZone(instant: Instant, timeZone: string): ZonedDateTime` | Preserves the instant |
| Local resolution | `resolveLocal(local: LocalDateTime, timeZone: string, disambiguation?: Disambiguation): ZonedDateTime` | Default `reject` on DST gaps/overlaps |
| Conversion to instant | `toInstant(zoned: ZonedDateTime): Instant` | Preserves the instant |
| Arithmetic | `add(value: Value, amount: DateUnits | TimeUnits, options?: ArithmeticOptions): Value` | Kind-specific calendar or elapsed-time arithmetic, described below |
| Comparison | `compare(a: Value, b: Value): -1 | 0 | 1` | Requires compatible kinds; no implicit time-zone coercion |
| Validation | `isValid(kind: TemporalKind, input: string): boolean` | Strict validation; no coercion |
| Serialisation | `serialise(value: Value): string` | Returns validated canonical value without localisation |

Functions are pure except `now` and `today`. A date-only value is never silently interpreted as midnight UTC. Arithmetic crossing DST uses calendar semantics for zoned dates and elapsed-time semantics for instants; conversion between kinds must be explicit. Canonical strings accept 0–9 fractional-second digits; parsing preserves supplied precision, while `now()` emits milliseconds by default. Arithmetic results use at most nanosecond precision and must not silently round supplied values. Formatting is presentation-only and may reduce displayed precision.

### Arithmetic rules

- `date`: integer years, months, weeks or days, using calendar arithmetic; no time units.
- `instant`: integer hours, minutes or seconds (elapsed time); no calendar units.
- `time`: integer hours, minutes or seconds; wraps within 24 hours and retains the time kind.
- `localDateTime`: one category per invocation: calendar units **or** elapsed time units, never both; no zone is inferred.
- `zonedDateTime`: calendar units advance local calendar fields preserving the named zone; time units advance the exact instant. For calendar operations that land in a DST gap or overlap, `options.disambiguation` defaults to `reject`.
- Calendar month/year overflow clamps to the last valid day (31 January + one month → 28 or 29 February). Empty, fractional or mixed-category amounts fail with `CLOCK_UNSUPPORTED_OPERATION`.
- Subtraction uses signed integer amounts. Comparisons require the same kind, except two zoned values may compare by their instants.

### Parsing and zones

- ISO calendar dates use the proleptic Gregorian calendar, with four-digit years from `0001` to `9999`. Leap seconds (`:60`) are rejected.
- An instant always has an explicit `Z`; a zoned value must contain both a numeric offset and bracketed IANA identifier, and its offset must be valid for that zone at the represented instant.
- `compatible` follows Temporal-style resolution: choose the earlier offset for an overlap, or advance by the size of the gap for a nonexistent local time. `earlier`/`later` explicitly choose the corresponding possible instant or gap-side adjustment.
- The implementation may rely on the host runtime's IANA time-zone data. Historical zone rules can vary between runtime versions; cross-runtime exactness requires the same zone-data revision.


**Error contract:** failed operations throw a documented `ClockError` with stable `code` and serialisable `params` fields; `isValid()` is the exception and returns a boolean. Raw implementation errors do not cross the public API.

**Error codes:** `CLOCK_INVALID_CONFIG`, `CLOCK_INVALID_INPUT`, `CLOCK_INVALID_TIME_ZONE`, `CLOCK_AMBIGUOUS_LOCAL_TIME`, `CLOCK_NONEXISTENT_LOCAL_TIME`, `CLOCK_INCOMPATIBLE_TYPES`, `CLOCK_UNSUPPORTED_OPERATION`. Public errors expose code and structured parameters, never implementation exceptions or localised wording.

No built-in HTTP endpoints, events, database migrations or persistence schemas.

## Permissions

None. Formatting and arithmetic are available without authentication. The server, not client time, must make access, expiry and deadline enforcement decisions. The clock does not decide permissions.

## Screens

None. No pages, visual clock, date picker, components or theme dependencies are provided.

## Headless surface

A consuming screen must provide accessible labels for presented times, identify time zones when omission could mislead, and handle localisation and DST ambiguity. SSR must use an explicit stable locale/time zone; browser preference changes may be applied after hydration or passed through host-controlled SSR context. Do not treat formatted strings as stored values.

## You will hit this

- **Not implemented:** this is a specification for review, not a usable package.
- **Input is strict:** no guesswork for `05/11/26`, missing offsets or free-text dates.
- **Zone identifiers:** IANA names such as `Europe/London`; never infer a zone from a UTC offset.
- **DST:** `resolveLocal` rejects overlaps/gaps by default; callers select a documented policy.
- **Clock trust:** browser/device time is adjustable; authoritative timestamps require a trusted server.
- **Persistence:** consumers store canonical values and preserve zone information when the domain requires it; this layer reads/writes representations but does not write to databases, cookies or local storage.
- **Testing:** inject a fixed `now()` port; no network clock synchronisation or background timers.
