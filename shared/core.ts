import { formatPattern, parsePattern } from './pattern'
export { formatPattern, parsePattern } from './pattern'
export type { PatternKind, PatternOptions } from './pattern'
import { Temporal } from '@js-temporal/polyfill'

export type Instant = string
export type CalendarDate = string
export type ClockTime = string
export type LocalDateTime = string
export type ZonedDateTime = string
export type TemporalKind = 'instant' | 'date' | 'time' | 'localDateTime' | 'zonedDateTime'
export type Value = { kind: TemporalKind; value: string }
export type Disambiguation = 'reject' | 'earlier' | 'later' | 'compatible'
export type DateUnits = { years?: number; months?: number; weeks?: number; days?: number }
export type TimeUnits = { hours?: number; minutes?: number; seconds?: number }
export type ArithmeticOptions = { disambiguation?: Disambiguation }
export type DisplayOptions = { locale?: string; timeZone?: string; hourCycle?: 'h11' | 'h12' | 'h23' | 'h24'; dateStyle?: 'full' | 'long' | 'medium' | 'short'; timeStyle?: 'full' | 'long' | 'medium' | 'short' }
export type ClockPort = { now(): string }
export type ClockSettings = Pick<DisplayOptions, 'locale' | 'timeZone' | 'hourCycle'>
export type ClockErrorCode = 'CLOCK_INVALID_CONFIG' | 'CLOCK_INVALID_PATTERN' | 'CLOCK_INVALID_INPUT' | 'CLOCK_INVALID_TIME_ZONE' | 'CLOCK_AMBIGUOUS_LOCAL_TIME' | 'CLOCK_NONEXISTENT_LOCAL_TIME' | 'CLOCK_INCOMPATIBLE_TYPES' | 'CLOCK_UNSUPPORTED_OPERATION'

export class ClockError extends Error {
  constructor(public readonly code: ClockErrorCode, public readonly params: Record<string, string | number> = {}) {
    super(code)
    this.name = 'ClockError'
  }
}
const fail = (code: ClockErrorCode): never => { throw new ClockError(code) }
const d = '(?!0000)[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])'
const t = '(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?'
const patterns: Record<TemporalKind, RegExp> = {
  date: new RegExp('^' + d + '$'),
  time: new RegExp('^' + t + '$'),
  localDateTime: new RegExp('^' + d + 'T' + t + '$'),
  instant: new RegExp('^' + d + 'T' + t + 'Z$'),
  zonedDateTime: new RegExp('^' + d + 'T' + t + '[+-](?:[01][0-9]|2[0-3]):[0-5][0-9]\\[[A-Za-z0-9_+./-]+\\]$'),
}
function zone(name: string): string {
  try {
    if (!name || /^[+-]\d/.test(name)) return fail('CLOCK_INVALID_TIME_ZONE')
    new Intl.DateTimeFormat('en-GB', { timeZone: name })
    return name
  } catch { return fail('CLOCK_INVALID_TIME_ZONE') }
}
function object(kind: TemporalKind, input: string) {
  switch (kind) {
    case 'instant': return Temporal.Instant.from(input)
    case 'date': return Temporal.PlainDate.from(input, { overflow: 'reject' })
    case 'time': return Temporal.PlainTime.from(input, { overflow: 'reject' })
    case 'localDateTime': return Temporal.PlainDateTime.from(input, { overflow: 'reject' })
    case 'zonedDateTime': return Temporal.ZonedDateTime.from(input, { offset: 'reject', disambiguation: 'reject' })
  }
}
export function parse(kind: TemporalKind, input: string): Value {
  if (typeof input !== 'string' || !patterns[kind]?.test(input)) return fail('CLOCK_INVALID_INPUT')
  try {
    if (kind === 'zonedDateTime') zone(input.slice(input.lastIndexOf('[') + 1, -1))
    object(kind, input)
    return { kind, value: input }
  } catch (e) {
    if (e instanceof ClockError) throw e
    return fail('CLOCK_INVALID_INPUT')
  }
}
export function isValid(kind: TemporalKind, input: string): boolean {
  try { parse(kind, input); return true } catch { return false }
}
const checked = (v: Value): Value => {
  if (!v || typeof v !== 'object') return fail('CLOCK_INVALID_INPUT')
  return parse(v.kind, v.value)
}
export const serialise = (v: Value): string => checked(v).value
export function toZone(value: Instant, timeZone: string): ZonedDateTime {
  parse('instant', value)
  const validatedZone = zone(timeZone)
  try {
    return parse('zonedDateTime', Temporal.Instant.from(value).toZonedDateTimeISO(validatedZone).toString()).value
  } catch { return fail('CLOCK_INVALID_INPUT') }
}
export function toInstant(value: ZonedDateTime): Instant {
  parse('zonedDateTime', value)
  try {
    return parse('instant', Temporal.ZonedDateTime.from(value).toInstant().toString()).value
  } catch { return fail('CLOCK_INVALID_INPUT') }
}
export function resolveLocal(local: LocalDateTime, timeZone: string, disambiguation: Disambiguation = 'reject'): ZonedDateTime {
  parse('localDateTime', local)
  zone(timeZone)
  if (!['reject', 'earlier', 'later', 'compatible'].includes(disambiguation)) return fail('CLOCK_INVALID_INPUT')
  const dt = Temporal.PlainDateTime.from(local)
  const fields = { timeZone, year: dt.year, month: dt.month, day: dt.day, hour: dt.hour, minute: dt.minute, second: dt.second, millisecond: dt.millisecond, microsecond: dt.microsecond, nanosecond: dt.nanosecond }
  try {
    if (disambiguation === 'reject') {
      const early = Temporal.ZonedDateTime.from(fields, { disambiguation: 'earlier' })
      const late = Temporal.ZonedDateTime.from(fields, { disambiguation: 'later' })
      if (!early.toPlainDateTime().equals(dt) || !late.toPlainDateTime().equals(dt)) return fail('CLOCK_NONEXISTENT_LOCAL_TIME')
      if (early.epochNanoseconds !== late.epochNanoseconds) return fail('CLOCK_AMBIGUOUS_LOCAL_TIME')
    }
    return parse('zonedDateTime', Temporal.ZonedDateTime.from(fields, { disambiguation }).toString()).value
  } catch (e) {
    if (e instanceof ClockError) throw e
    return fail('CLOCK_INVALID_INPUT')
  }
}
function amount(input: DateUnits | TimeUnits) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('CLOCK_UNSUPPORTED_OPERATION')
  const keys = Object.keys(input)
  const dates = ['years', 'months', 'weeks', 'days']
  const times = ['hours', 'minutes', 'seconds']
  if (!keys.length || keys.some(k => ![...dates, ...times].includes(k) || !Number.isSafeInteger((input as Record<string, number>)[k]))) return fail('CLOCK_UNSUPPORTED_OPERATION')
  const date = keys.some(k => dates.includes(k))
  const time = keys.some(k => times.includes(k))
  if (date && time) return fail('CLOCK_UNSUPPORTED_OPERATION')
  return { date, time }
}
export function add(value: Value, units: DateUnits | TimeUnits, options: ArithmeticOptions = {}): Value {
  checked(value)
  const { date, time } = amount(units)
  if ((value.kind === 'date' && time) || (value.kind === 'time' && date) || (value.kind === 'instant' && date)) return fail('CLOCK_UNSUPPORTED_OPERATION')
  try {
    let result: string
    switch (value.kind) {
      case 'date': result = Temporal.PlainDate.from(value.value).add(units as DateUnits, { overflow: 'constrain' }).toString(); break
      case 'time': result = Temporal.PlainTime.from(value.value).add(units as TimeUnits).toString(); break
      case 'instant': result = Temporal.Instant.from(value.value).add(units as TimeUnits).toString(); break
      case 'localDateTime': result = Temporal.PlainDateTime.from(value.value).add(units, { overflow: 'constrain' }).toString(); break
      case 'zonedDateTime': {
        const z = Temporal.ZonedDateTime.from(value.value)
        if (time) result = z.toInstant().add(units as TimeUnits).toZonedDateTimeISO(z.timeZoneId).toString()
        else result = resolveLocal(z.toPlainDateTime().add(units as DateUnits, { overflow: 'constrain' }).toString(), z.timeZoneId, options.disambiguation ?? 'reject')
      }
    }
    return parse(value.kind, result)
  } catch (e) {
    if (e instanceof ClockError) throw e
    return fail('CLOCK_UNSUPPORTED_OPERATION')
  }
}
export function compare(a: Value, b: Value): -1 | 0 | 1 {
  checked(a); checked(b)
  if (a.kind !== b.kind) return fail('CLOCK_INCOMPATIBLE_TYPES')
  try {
    const x = object(a.kind, a.value)!
    const y = object(b.kind, b.value)!
    let n: number
    switch (a.kind) {
      case 'date': n = Temporal.PlainDate.compare(x as Temporal.PlainDate, y as Temporal.PlainDate); break
      case 'time': n = Temporal.PlainTime.compare(x as Temporal.PlainTime, y as Temporal.PlainTime); break
      case 'instant': n = Temporal.Instant.compare(x as Temporal.Instant, y as Temporal.Instant); break
      case 'localDateTime': n = Temporal.PlainDateTime.compare(x as Temporal.PlainDateTime, y as Temporal.PlainDateTime); break
      case 'zonedDateTime': n = Temporal.ZonedDateTime.compare(x as Temporal.ZonedDateTime, y as Temporal.ZonedDateTime)
    }
    return Math.sign(n) as -1 | 0 | 1
  } catch (e) {
    if (e instanceof ClockError) throw e
    return fail('CLOCK_INVALID_INPUT')
  }
}
export function format(value: Value, options: DisplayOptions = {}): string {
  checked(value)
  if (!options || typeof options !== 'object') return fail('CLOCK_INVALID_CONFIG')
  const opts: Intl.DateTimeFormatOptions = { hourCycle: options.hourCycle ?? 'h23' }
  if (options.dateStyle) opts.dateStyle = options.dateStyle
  if (options.timeStyle) opts.timeStyle = options.timeStyle
  if (!opts.dateStyle && !opts.timeStyle) {
    if (value.kind === 'date') opts.dateStyle = 'medium'
    else if (value.kind === 'time') opts.timeStyle = 'medium'
    else { opts.dateStyle = 'medium'; opts.timeStyle = 'short' }
  }
  if (value.kind === 'date') delete opts.timeStyle
  if (value.kind === 'time') delete opts.dateStyle
  const locale = options.locale ?? 'en-GB'
  try {
    if (value.kind === 'instant') return Temporal.Instant.from(value.value).toZonedDateTimeISO(zone(options.timeZone ?? 'UTC')).toLocaleString(locale, opts)
    if (value.kind === 'zonedDateTime') {
      const z = Temporal.ZonedDateTime.from(value.value)
      return z.withTimeZone(options.timeZone ? zone(options.timeZone) : z.timeZoneId).toLocaleString(locale, opts)
    }
    if (value.kind === 'date') return Temporal.PlainDate.from(value.value).toLocaleString(locale, opts)
    if (value.kind === 'time') return Temporal.PlainTime.from(value.value).toLocaleString(locale, opts)
    return Temporal.PlainDateTime.from(value.value).toLocaleString(locale, opts)
  } catch { return fail('CLOCK_INVALID_CONFIG') }
}
export function createClock(settings: ClockSettings = {}, provider: ClockPort = { now: () => new Date().toISOString() }) {
  if (!settings || typeof settings !== 'object') return fail('CLOCK_INVALID_CONFIG')
  const timeZone = zone(settings.timeZone ?? 'UTC')
  const locale = settings.locale ?? 'en-GB'
  const hourCycle = settings.hourCycle ?? 'h23'
  try {
    new Intl.DateTimeFormat(locale)
    if (!['h11', 'h12', 'h23', 'h24'].includes(hourCycle)) return fail('CLOCK_INVALID_CONFIG')
  } catch { return fail('CLOCK_INVALID_CONFIG') }
  const now = (): Instant => {
    try { return parse('instant', provider.now()).value }
    catch { return fail('CLOCK_INVALID_INPUT') }
  }
  return Object.freeze({
    now,
    today: (z: string = timeZone): CalendarDate => {
      const current = now()
      const resolvedZone = zone(z)
      try { return parse('date', Temporal.Instant.from(current).toZonedDateTimeISO(resolvedZone).toPlainDate().toString()).value }
      catch (e) {
        if (e instanceof ClockError) throw e
        return fail('CLOCK_INVALID_INPUT')
      }
    },
    parse, isValid, serialise, toZone, toInstant, resolveLocal, add, compare, formatPattern, parsePattern,
    format: (v: Value, opts: DisplayOptions = {}) => format(v, { locale, hourCycle, ...opts, timeZone: opts.timeZone ?? timeZone }),
  })
}
const systemClock = createClock()
export const now = systemClock.now
export const today = systemClock.today
