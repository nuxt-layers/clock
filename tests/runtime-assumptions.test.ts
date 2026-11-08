import { describe, expect, it } from 'vitest'
import { add, compare, createClock, formatInterchange, parse, parseInterchange, resolveLocal, serialise, toInstant, toZone } from '../shared/core'

// Contract tests for the runtime assumptions CONTRACT.md documents. A failure here means the
// runtime's time-zone data or precision differs from what Clock promises consumers.
const offset = (instant: string, zone: string) => /([+-]\d{2}:\d{2})\[/.exec(toZone(instant, zone))![1]

describe('time-zone data (IANA tzdata 2024b or later)', () => {
  it('applies current daylight-saving rules', () => {
    expect(offset('2026-03-29T00:59:59Z', 'Europe/London')).toBe('+00:00')
    expect(offset('2026-03-29T01:00:00Z', 'Europe/London')).toBe('+01:00')
    expect(offset('2026-10-25T01:00:00Z', 'Europe/London')).toBe('+00:00')
    expect(offset('2026-01-15T12:00:00Z', 'America/Sao_Paulo')).toBe('-03:00') // no DST since 2019
  })
  it('includes rule changes up to tzdata 2024b', () => {
    expect(offset('2023-07-01T00:00:00Z', 'Asia/Almaty')).toBe('+06:00')
    expect(offset('2026-07-01T00:00:00Z', 'Asia/Almaty')).toBe('+05:00') // 2024a: Kazakhstan unified on +05
    expect(offset('2023-07-01T00:00:00Z', 'America/Asuncion')).toBe('-04:00')
    expect(offset('2026-07-01T00:00:00Z', 'America/Asuncion')).toBe('-03:00') // 2024b: Paraguay permanent -03
    expect(offset('2026-01-15T00:00:00Z', 'America/Nuuk')).toBe('-02:00') // 2023: Greenland moved to -02
    expect(offset('2026-07-01T00:00:00Z', 'America/Nuuk')).toBe('-01:00')
  })
  it('handles unusual offsets and half-hour daylight saving', () => {
    expect(offset('2026-11-08T00:00:00Z', 'Pacific/Kiritimati')).toBe('+14:00')
    expect(offset('2026-11-08T00:00:00Z', 'Asia/Kathmandu')).toBe('+05:45')
    expect(offset('2026-01-15T00:00:00Z', 'Australia/Lord_Howe')).toBe('+11:00')
    expect(offset('2026-07-01T00:00:00Z', 'Australia/Lord_Howe')).toBe('+10:30')
  })
  it('keeps the zone name the caller gave, including links', () => {
    expect(toZone('2026-01-15T00:00:00Z', 'Europe/Kiev')).toBe('2026-01-15T02:00:00+02:00[Europe/Kiev]')
    expect(toZone('2026-01-15T00:00:00Z', 'Europe/Kyiv')).toBe('2026-01-15T02:00:00+02:00[Europe/Kyiv]')
  })
})

describe('precision', () => {
  const ns = '2026-11-08T17:00:00.123456789Z'
  it('preserves nanoseconds through parsing, zones, arithmetic and DST resolution', () => {
    expect(serialise(parse('instant', ns))).toBe(ns)
    expect(toInstant(toZone(ns, 'Asia/Kathmandu'))).toBe(ns)
    expect(add(parse('instant', ns), { seconds: 1 }).value).toBe('2026-11-08T17:00:01.123456789Z')
    expect(resolveLocal('2026-10-25T01:30:00.000000001', 'Europe/London', 'later')).toBe('2026-10-25T01:30:00.000000001+00:00[Europe/London]')
    expect(parseInterchange('numericDate', '1794157200.123456789').value).toBe(ns)
  })
  it('distinguishes values one nanosecond apart', () => {
    expect(compare(parse('instant', ns), parse('instant', '2026-11-08T17:00:00.12345679Z'))).toBe(-1)
  })
  it('reads the system clock at millisecond precision', () => {
    expect(createClock().now()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
  it('keeps generated results inside years 0001 to 9999', () => {
    expect(() => toZone('9999-12-31T23:59:59.999999999Z', 'Pacific/Kiritimati')).toThrowError('CLOCK_INVALID_INPUT')
    expect(() => add(parse('date', '9999-12-31'), { days: 1 })).toThrowError('CLOCK_INVALID_INPUT')
    expect(formatInterchange(parse('instant', '0001-01-01T00:00:00Z'), 'numericDate')).toBe(-62135596800)
  })
})
