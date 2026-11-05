# Clock — Consumer Contract

> **In short:** a single typed date/time interface for Nuxt server and browser code, with explicit temporal types, time zones and deterministic testing.

**Status:** Core and Nuxt/Nitro integration locally validated on Node 26.13.0 and pnpm 12.16.1: 10 core tests, 2 minimal-host integration tests, both typechecks and minimal-host production build passed. Generated dependency lockfiles are **not yet committed**; reproducible frozen installs and CI acceptance remain outstanding.

## Install

Package: `@nuxt-layers/clock` (Git-backed dependency resolving the latest accepted `master` during development; commit resolution recorded in the host lockfile). Nuxt 4.6+ is required. **Do not treat the integration as accepted until lockfiles are committed and CI checks pass.**

Host Nuxt configuration (the package root is the layer entry):

```ts
export default defineNuxtConfig({
  extends: ['@nuxt-layers/clock'],
  runtimeConfig: {
    public: {
      clock: { locale: 'en-GB', timeZone: 'UTC', hourCycle: 'h23' },
    },
  },
})
```

The host need not write adapters or register HTTP endpoints for the capability. The layer adds no HTTP routes. Install with the host's package manager, then compose with `extends` as above; an example is in `examples/minimal-host`.

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `runtimeConfig.public.clock.locale` | `en-GB` | BCP 47 locale used when formatting without an override |
| `runtimeConfig.public.clock.timeZone` | `UTC` | IANA time zone for calendar operations and default presentation |
| `runtimeConfig.public.clock.hourCycle` | `h23` | Hour-cycle preference for localised output (`h11`, `h12`, `h23`, `h24`) |

A caller may override locale, time zone and hour cycle per clock instance or formatting call. Invalid configuration fails at start-up with `CLOCK_INVALID_CONFIG`. No environment variables, secrets or network services are required.

The host resolves user preferences, when available, and passes them as explicit overrides. The layer never looks up identity, profile or tenant records. Browser time-zone detection must be an explicit opt-in at the presentation boundary; it cannot silently change SSR output.

## Host passes

Nothing is required. The default clock uses the system clock.

For deterministic tests or trusted host integration, a host may supply the existing ADR-0012 structural clock port:

```ts
type ClockPort = { now(): string } // this layer returns UTC ISO 8601, e.g. 2026-11-05T14:30:00.000Z
```

`now()` is synchronous and returns a valid instant. It is scoped per application/server request or test invocation, never a mutable global shared across requests. This port's call shape remains `now()`; the return-value definition here is proposed for this capability and must not be presumed to constrain other existing consumers.

## Client and server functions

**Public source exports:** `@nuxt-layers/clock/core` exposes the pure TypeScript functions; `@nuxt-layers/clock/server` exposes `useServerClock(overrides?, provider?)` and `createClock` to Nitro handlers; the Nuxt layer auto-imports `useClock(overrides?, provider?)` for Vue/SSR. `@nuxt-layers/clock` is solely the Nuxt layer configuration entry. Both helpers expose the same `createClock` operation set and read `runtimeConfig.public.clock`, with optional per-call overrides. No public import exposes private implementation paths. The `/server` entry is server-only: call it within a Nitro handler, not during module initialisation.

Client/SSR example:

```ts
const clock = useClock({ timeZone: 'Europe/London' })
const date = clock.format(clock.parse('date', '2026-11-05'))
```

Server handler example:

```ts
import { useServerClock } from '@nuxt-layers/clock/server'
const clock = useServerClock()
const issuedAt = clock.now()
```

Inject deterministic time with `createClock(settings?, { now: () => '2026-11-05T14:30:00.000Z' })` or the optional provider argument on either helper. Provider injection is confined to that instance; no global mutation.

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

- **Integration acceptance pending:** local core/SSR/Nitro tests, typechecks and production build passed, but dependency lockfiles and frozen-install CI checks remain outstanding. The package is private (not published); Git-backed development consumption is intended.
- **Input is strict:** no guesswork for `05/11/26`, missing offsets or free-text dates.
- **Zone identifiers:** IANA names such as `Europe/London`; never infer a zone from a UTC offset.
- **DST:** `resolveLocal` rejects overlaps/gaps by default; callers select a documented policy.
- **Clock trust:** browser/device time is adjustable; authoritative timestamps require a trusted server.
- **Persistence:** consumers store canonical values and preserve zone information when the domain requires it; this layer reads/writes representations but does not write to databases, cookies or local storage.
- **Testing:** inject a fixed `now()` port; no network clock synchronisation or background timers.
