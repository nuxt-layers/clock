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


describe('public error boundary', () => {
  it('maps thrown provider exceptions to a stable ClockError', () => {
    const clock = createClock({}, { now: () => { throw new Error('provider unavailable') } })
    try {
      clock.now()
      throw new Error('expected failure')
    } catch (error) {
      expect(error).toBeInstanceOf(ClockError)
      expect((error as ClockError).code).toBe('CLOCK_INVALID_INPUT')
      expect((error as ClockError).params).toEqual({})
    }
    expect(() => clock.today()).toThrowError('CLOCK_INVALID_INPUT')
  })

  it('rejects invalid provider output without exposing native parse errors', () => {
    const clock = createClock({}, { now: () => 'tomorrow' })
    expect(() => clock.now()).toThrowError('CLOCK_INVALID_INPUT')
    expect(() => clock.today()).toThrowError('CLOCK_INVALID_INPUT')
  })

  it('validates runtime values and settings even when TypeScript was bypassed', () => {
    expect(() => serialise(null as unknown as Parameters<typeof serialise>[0]))
      .toThrowError('CLOCK_INVALID_INPUT')
    expect(() => compare(null as unknown as ReturnType<typeof parse>, parse('date', '2026-01-01')))
      .toThrowError('CLOCK_INVALID_INPUT')
    expect(() => createClock(null as unknown as Parameters<typeof createClock>[0]))
      .toThrowError('CLOCK_INVALID_CONFIG')
    expect(() => format(parse('date', '2026-01-01'), null as unknown as Parameters<typeof format>[1]))
      .toThrowError('CLOCK_INVALID_CONFIG')
  })

  it('rejects invalid time zones and unsupported arithmetic uniformly', () => {
    const clock = createClock({}, { now: () => '2026-01-01T00:00:00.000Z' })
    expect(() => clock.today('Not/A_Zone')).toThrowError('CLOCK_INVALID_TIME_ZONE')
    expect(() => add(parse('date', '2026-01-01'), {})).toThrowError('CLOCK_UNSUPPORTED_OPERATION')
    expect(() => add(parse('date', '2026-01-01'), { days: 0.5 })).toThrowError('CLOCK_UNSUPPORTED_OPERATION')
  })
})

describe('temporal boundaries', () => {
  it('accepts four-digit calendar endpoints and rejects year rollover', () => {
    expect(isValid('date', '0001-01-01')).toBe(true)
    expect(isValid('date', '9999-12-31')).toBe(true)
    expect(isValid('date', '10000-01-01')).toBe(false)
    expect(() => add(parse('date', '9999-12-31'), { days: 1 }))
      .toThrowError('CLOCK_INVALID_INPUT')
    expect(() => add(parse('date', '0001-01-01'), { days: -1 }))
      .toThrowError('CLOCK_INVALID_INPUT')
  })

  it('distinguishes the DST overlap policies', () => {
    const local = '2026-10-25T01:30:00'
    const early = resolveLocal(local, 'Europe/London', 'earlier')
    const late = resolveLocal(local, 'Europe/London', 'later')
    expect(early).toContain('+01:00[Europe/London]')
    expect(late).toContain('+00:00[Europe/London]')
    expect(resolveLocal(local, 'Europe/London', 'compatible')).toBe(early)
  })

  it('distinguishes the DST gap policies', () => {
    const local = '2026-03-29T01:30:00'
    const early = resolveLocal(local, 'Europe/London', 'earlier')
    const late = resolveLocal(local, 'Europe/London', 'later')
    expect(early).toContain('2026-03-29T00:30:00+00:00[Europe/London]')
    expect(late).toContain('2026-03-29T02:30:00+01:00[Europe/London]')
    expect(resolveLocal(local, 'Europe/London', 'compatible')).toBe(late)
  })

  it('retains nanoseconds through zone conversion and arithmetic', () => {
    const zoned = toZone(instant, 'Europe/London')
    expect(toInstant(zoned)).toBe(instant)
    expect(add(parse('instant', instant), { seconds: 1 }).value)
      .toBe('2026-11-05T14:30:01.123456789Z')
  })

  it('handles leap-year rollover and rejects missing or mixed units', () => {
    expect(add(parse('date', '2024-02-29'), { years: 1 }).value).toBe('2025-02-28')
    expect(() => add(parse('instant', instant), { days: 1 })).toThrowError('CLOCK_UNSUPPORTED_OPERATION')
    expect(() => add(parse('localDateTime', '2026-01-01T12:00:00'), { days: 1, hours: 1 }))
      .toThrowError('CLOCK_UNSUPPORTED_OPERATION')
  })
})
