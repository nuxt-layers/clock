import { describe, expect, it } from 'vitest'
import { add, ClockError, compare, createClock, format, isValid, parse, resolveLocal, serialise, toInstant, toZone } from '../shared/core'

const instant = '2026-11-05T14:30:00.123456789Z'

describe('canonical values', () => {
  it('preserves nanosecond precision and requires explicit kinds', () => {
    expect(serialise(parse('instant', instant))).toBe(instant)
    expect(isValid('instant', '2026-11-05T14:30:00')).toBe(false)
    expect(isValid('date', '2026-02-29')).toBe(false)
    expect(isValid('date', '2024-02-29')).toBe(true)
    expect(isValid('time', '23:59:60')).toBe(false)
    expect(isValid('date', '0000-01-01')).toBe(false)
    expect(isValid('date', '2026-13-01')).toBe(false)
  })
  it('rejects mismatched offsets and invalid zones', () => {
    expect(() => parse('zonedDateTime', '2026-07-05T12:00:00+00:00[Europe/London]')).toThrow(ClockError)
    expect(() => toZone(instant, 'Not/A_Zone')).toThrowError('CLOCK_INVALID_TIME_ZONE')
  })
})

describe('zoned semantics', () => {
  it('round-trips the same instant', () => {
    const zoned = toZone(instant, 'Europe/London')
    expect(toInstant(zoned)).toBe(instant)
  })
  it('rejects daylight-saving gaps and overlaps by default', () => {
    expect(() => resolveLocal('2026-03-29T01:30:00', 'Europe/London')).toThrowError('CLOCK_NONEXISTENT_LOCAL_TIME')
    expect(() => resolveLocal('2026-10-25T01:30:00', 'Europe/London')).toThrowError('CLOCK_AMBIGUOUS_LOCAL_TIME')
  })
  it('resolves ambiguities only when asked', () => {
    expect(resolveLocal('2026-10-25T01:30:00', 'Europe/London', 'earlier'))
      .not.toBe(resolveLocal('2026-10-25T01:30:00', 'Europe/London', 'later'))
  })
})

describe('arithmetic', () => {
  it('clamps calendar overflow', () => {
    expect(add(parse('date', '2026-01-31'), { months: 1 }).value).toBe('2026-02-28')
    expect(add(parse('date', '2024-01-31'), { months: 1 }).value).toBe('2024-02-29')
  })
  it('distinguishes calendar and elapsed-time operations', () => {
    const start = parse('zonedDateTime', '2026-03-28T12:00:00+00:00[Europe/London]')
    const nextDay = add(start, { days: 1 })
    const plusDayInHours = add(start, { hours: 24 })
    expect(nextDay.value).toContain('2026-03-29T12:00:00')
    expect(plusDayInHours.value).toContain('2026-03-29T13:00:00')
    expect(() => add(start, { days: 1, hours: 2 })).toThrowError('CLOCK_UNSUPPORTED_OPERATION')
  })
  it('compares compatible values only', () => {
    expect(compare(parse('date', '2026-01-01'), parse('date', '2026-01-02'))).toBe(-1)
    expect(() => compare(parse('date', '2026-01-01'), parse('instant', instant))).toThrowError('CLOCK_INCOMPATIBLE_TYPES')
  })
})

describe('host integration boundary', () => {
  it('uses an injected clock without global mutation', () => {
    const first = createClock({ timeZone: 'Europe/London' }, { now: () => '2026-07-01T23:30:00.000Z' })
    const second = createClock({}, { now: () => '2026-01-01T00:00:00.000Z' })
    expect(first.today()).toBe('2026-07-02')
    expect(second.today()).toBe('2026-01-01')
    expect(first.now()).toBe('2026-07-01T23:30:00.000Z')
  })
  it('formats for a supplied locale', () => {
    expect(format(parse('date', '2026-11-05'), { locale: 'en-GB', dateStyle: 'short' })).toContain('05')
  })
})
