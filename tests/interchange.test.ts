import { describe, expect, it } from 'vitest'
import { createClock, formatInterchange, parse, parseInterchange, type InterchangeFormat } from '../shared/core'

const at = (value: string) => parse('instant', value)
const code = (fn: () => unknown) => { try { fn() } catch (e) { return (e as { code?: string }).code } return undefined }

describe('rfc3339', () => {
  it('reads Z and numeric offsets as exact instants', () => {
    expect(parseInterchange('rfc3339', '2026-11-08T17:00:00Z').value).toBe('2026-11-08T17:00:00Z')
    expect(parseInterchange('rfc3339', '2026-11-08T18:00:00.250+01:00').value).toBe('2026-11-08T17:00:00.25Z')
    expect(parseInterchange('rfc3339', '2026-11-08t17:00:00z').value).toBe('2026-11-08T17:00:00Z')
  })
  it('rejects missing offsets, impossible dates and leap seconds', () => {
    for (const input of ['2026-11-08T17:00:00', '2026-02-30T00:00:00Z', '2026-12-31T23:59:60Z', '2026-11-08 17:00:00Z'])
      expect(code(() => parseInterchange('rfc3339', input))).toBe('CLOCK_INVALID_INPUT')
  })
  it('writes Z for instants and keeps a zoned offset', () => {
    expect(formatInterchange(at('2026-11-08T17:00:00Z'), 'rfc3339')).toBe('2026-11-08T17:00:00Z')
    expect(formatInterchange(parse('zonedDateTime', '2026-07-01T18:00:00+01:00[Europe/London]'), 'rfc3339')).toBe('2026-07-01T18:00:00+01:00')
  })
})

describe('numericDate and epochMilliseconds', () => {
  it('reads JWT NumericDate as numbers, strings and decimals', () => {
    expect(parseInterchange('numericDate', 1794157200).value).toBe('2026-11-08T17:00:00Z')
    expect(parseInterchange('numericDate', '1794157200.5').value).toBe('2026-11-08T17:00:00.5Z')
    expect(parseInterchange('numericDate', -1).value).toBe('1969-12-31T23:59:59Z')
  })
  it('writes integer seconds and milliseconds, truncating towards the past', () => {
    expect(formatInterchange(at('2026-11-08T17:00:00.999Z'), 'numericDate')).toBe(1794157200)
    expect(formatInterchange(at('1969-12-31T23:59:59.5Z'), 'numericDate')).toBe(-1)
    expect(formatInterchange(at('2026-11-08T17:00:00.123456Z'), 'epochMilliseconds')).toBe(1794157200123)
  })
  it('round-trips epoch milliseconds and rejects non-integers and out-of-range values', () => {
    expect(parseInterchange('epochMilliseconds', 1794157200123).value).toBe('2026-11-08T17:00:00.123Z')
    for (const input of [1.5, '1.5', '1e12', Number.NaN, '', '0x10'])
      expect(code(() => parseInterchange('epochMilliseconds', input as never))).toBe('CLOCK_INVALID_INPUT')
    expect(code(() => parseInterchange('numericDate', 300000000000))).toBe('CLOCK_INVALID_INPUT')
  })
})

describe('httpDate', () => {
  it('writes and reads IMF-fixdate', () => {
    expect(formatInterchange(at('2026-11-08T17:00:00.9Z'), 'httpDate')).toBe('Sun, 08 Nov 2026 17:00:00 GMT')
    expect(parseInterchange('httpDate', 'Sun, 08 Nov 2026 17:00:00 GMT').value).toBe('2026-11-08T17:00:00Z')
  })
  it('reads the obsolete forms RFC 9110 requires recipients to accept', () => {
    expect(parseInterchange('httpDate', 'Sunday, 06-Nov-94 08:49:37 GMT').value).toBe('1994-11-06T08:49:37Z')
    expect(parseInterchange('httpDate', 'Sun Nov  6 08:49:37 1994').value).toBe('1994-11-06T08:49:37Z')
  })
  it('places RFC 850 two-digit years no more than 50 years ahead of the clock', () => {
    const clock = createClock({}, { now: () => '2026-01-01T00:00:00Z' })
    expect(clock.parseInterchange('httpDate', 'Wednesday, 01-Jan-76 00:00:00 GMT').value).toBe('2076-01-01T00:00:00Z')
    expect(clock.parseInterchange('httpDate', 'Saturday, 01-Jan-77 00:00:00 GMT').value).toBe('1977-01-01T00:00:00Z')
  })
  it('rejects weekdays that disagree with the date and other zones', () => {
    expect(code(() => parseInterchange('httpDate', 'Mon, 08 Nov 2026 17:00:00 GMT'))).toBe('CLOCK_INVALID_INPUT')
    expect(code(() => parseInterchange('httpDate', 'Sun, 08 Nov 2026 17:00:00 +0000'))).toBe('CLOCK_INVALID_INPUT')
  })
})

describe('rfc5322', () => {
  it('writes a numeric zone and reads optional day names, seconds and named zones', () => {
    expect(formatInterchange(at('2026-11-08T17:00:00Z'), 'rfc5322')).toBe('Sun, 08 Nov 2026 17:00:00 +0000')
    expect(parseInterchange('rfc5322', 'Sun, 08 Nov 2026 12:00:00 -0500').value).toBe('2026-11-08T17:00:00Z')
    expect(parseInterchange('rfc5322', '8 Nov 2026 12:00 EST').value).toBe('2026-11-08T17:00:00Z')
    expect(parseInterchange('rfc5322', '8 Nov 2026 17:00:00 GMT').value).toBe('2026-11-08T17:00:00Z')
  })
  it('rejects two-digit years, military zones and disagreeing weekdays', () => {
    for (const input of ['8 Nov 26 17:00 +0000', '8 Nov 2026 17:00 A', 'Mon, 08 Nov 2026 17:00 +0000'])
      expect(code(() => parseInterchange('rfc5322', input))).toBe('CLOCK_INVALID_INPUT')
  })
})

describe('compact UTC formats', () => {
  it('round-trips ISO 8601 basic and GeneralizedTime', () => {
    expect(formatInterchange(at('2026-11-08T17:00:00Z'), 'iso8601Basic')).toBe('20261108T170000Z')
    expect(parseInterchange('iso8601Basic', '20261108T170000Z').value).toBe('2026-11-08T17:00:00Z')
    expect(formatInterchange(at('2051-01-01T00:00:00.5Z'), 'asn1GeneralizedTime')).toBe('20510101000000Z')
    expect(parseInterchange('asn1GeneralizedTime', '20510101000000Z').value).toBe('2051-01-01T00:00:00Z')
    expect(code(() => parseInterchange('asn1GeneralizedTime', '20510101000000.5Z'))).toBe('CLOCK_INVALID_INPUT')
  })
  it('uses the fixed RFC 5280 pivot for UTCTime and refuses years it cannot hold', () => {
    expect(parseInterchange('asn1UtcTime', '491231235959Z').value).toBe('2049-12-31T23:59:59Z')
    expect(parseInterchange('asn1UtcTime', '500101000000Z').value).toBe('1950-01-01T00:00:00Z')
    expect(formatInterchange(at('2049-12-31T23:59:59Z'), 'asn1UtcTime')).toBe('491231235959Z')
    expect(code(() => formatInterchange(at('2050-01-01T00:00:00Z'), 'asn1UtcTime'))).toBe('CLOCK_INVALID_INPUT')
  })
})

describe('interchange boundary', () => {
  it('rejects unknown formats and kinds that are not exact instants', () => {
    expect(code(() => parseInterchange('unix' as InterchangeFormat, 0))).toBe('CLOCK_UNSUPPORTED_OPERATION')
    expect(code(() => formatInterchange(at('2026-11-08T17:00:00Z'), 'unix' as InterchangeFormat))).toBe('CLOCK_UNSUPPORTED_OPERATION')
    expect(code(() => formatInterchange(parse('date', '2026-11-08'), 'httpDate'))).toBe('CLOCK_INCOMPATIBLE_TYPES')
    expect(code(() => parseInterchange('rfc3339', 20261108 as never))).toBe('CLOCK_INVALID_INPUT')
  })
  it('round-trips every format at second precision', () => {
    const value = at('2026-11-08T17:00:00Z')
    for (const f of ['rfc3339', 'numericDate', 'epochMilliseconds', 'httpDate', 'rfc5322', 'iso8601Basic', 'asn1UtcTime', 'asn1GeneralizedTime'] as const)
      expect(parseInterchange(f, formatInterchange(value, f)).value).toBe(value.value)
  })
})
