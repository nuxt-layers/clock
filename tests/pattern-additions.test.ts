import { describe, expect, it } from 'vitest'
import { formatPattern, parse, parsePattern } from '../shared/core'

const code = (fn: () => unknown) => { try { fn() } catch (e) { return (e as { code?: string }).code } return undefined }
const date = parse('date', '2026-11-08')
const evening = parse('localDateTime', '2026-11-08T17:05:09')

describe('unpadded fields', () => {
  it('writes without padding and reads one or two digits', () => {
    expect(formatPattern(parse('date', '2026-01-05'), 'd/M/yyyy')).toBe('5/1/2026')
    expect(parsePattern('date', '5/1/2026', 'd/M/yyyy').value).toBe('2026-01-05')
    expect(parsePattern('date', '05/01/2026', 'd/M/yyyy').value).toBe('2026-01-05')
    expect(formatPattern(parse('time', '07:05:09'), 'H:mm:ss')).toBe('7:05:09')
    expect(parsePattern('time', '7:05:09', 'H:mm:ss').value).toBe('07:05:09')
  })
  it('rejects three digits and patterns that cannot be split', () => {
    expect(code(() => parsePattern('date', '123/1/2026', 'd/M/yyyy'))).toBe('CLOCK_INVALID_INPUT')
    for (const pattern of ['dMyyyy', 'ddMyyyy', 'd/Myyyy'])
      expect(code(() => formatPattern(date, pattern))).toBe('CLOCK_INVALID_PATTERN')
  })
})

describe('English month and weekday names', () => {
  it('writes abbreviated and full names', () => {
    expect(formatPattern(date, 'dd MMM yyyy')).toBe('08 Nov 2026')
    expect(formatPattern(date, 'EEEE, d MMMM yyyy')).toBe('Sunday, 8 November 2026')
    expect(formatPattern(date, 'EEE dd/MM/yyyy')).toBe('Sun 08/11/2026')
  })
  it('reads names in any letter case', () => {
    expect(parsePattern('date', '08 nov 2026', 'dd MMM yyyy').value).toBe('2026-11-08')
    expect(parsePattern('date', 'SUNDAY, 8 NOVEMBER 2026', 'EEEE, d MMMM yyyy').value).toBe('2026-11-08')
  })
  it('requires the weekday to agree with the date and rejects partial or wrong-length names', () => {
    expect(code(() => parsePattern('date', 'Mon 08/11/2026', 'EEE dd/MM/yyyy'))).toBe('CLOCK_INVALID_INPUT')
    expect(code(() => parsePattern('date', '08 November 2026', 'dd MMM yyyy'))).toBe('CLOCK_INVALID_INPUT')
    expect(code(() => parsePattern('date', '08 Novem 2026', 'dd MMMM yyyy'))).toBe('CLOCK_INVALID_INPUT')
    expect(code(() => parsePattern('date', '31 Nov 2026', 'dd MMM yyyy'))).toBe('CLOCK_INVALID_INPUT')
  })
  it('keeps quoted literals and separators case-sensitive', () => {
    expect(parsePattern('localDateTime', '2026-11-08T17:05:09', "yyyy-MM-dd'T'HH:mm:ss").value).toBe('2026-11-08T17:05:09')
    expect(code(() => parsePattern('localDateTime', '2026-11-08t17:05:09', "yyyy-MM-dd'T'HH:mm:ss"))).toBe('CLOCK_INVALID_INPUT')
  })
})

describe('12-hour clock', () => {
  it('writes h, hh and lower-case am/pm', () => {
    expect(formatPattern(evening, 'd MMM yyyy h:mm:ss a')).toBe('8 Nov 2026 5:05:09 pm')
    expect(formatPattern(parse('time', '00:30:00'), 'hh:mm:ss a')).toBe('12:30:00 am')
    expect(formatPattern(parse('time', '12:00:00'), 'h:mm:ss a')).toBe('12:00:00 pm')
  })
  it('reads am/pm in any case, mapping 12 am to midnight and 12 pm to noon', () => {
    expect(parsePattern('time', '5:30:00 PM', 'h:mm:ss a').value).toBe('17:30:00')
    expect(parsePattern('time', '12:00:00 am', 'h:mm:ss a').value).toBe('00:00:00')
    expect(parsePattern('time', '12:00:00 pm', 'hh:mm:ss a').value).toBe('12:00:00')
  })
  it('rejects hours outside 1-12 and contradictory or incomplete patterns', () => {
    for (const input of ['0:30:00 am', '13:30:00 pm'])
      expect(code(() => parsePattern('time', input, 'h:mm:ss a'))).toBe('CLOCK_INVALID_INPUT')
    const time = parse('time', '17:00:00')
    for (const pattern of ['h:mm:ss', 'HH:mm:ss a', 'HH:hh:mm:ss a', 'hh:mm:ss a a'])
      expect(code(() => formatPattern(time, pattern))).toBe('CLOCK_INVALID_PATTERN')
  })
})

describe('kind rules for the new tokens', () => {
  it('rejects weekdays in time patterns and am/pm in date patterns', () => {
    expect(code(() => formatPattern(parse('time', '17:00:00'), 'EEE HH:mm:ss'))).toBe('CLOCK_INVALID_PATTERN')
    expect(code(() => formatPattern(date, 'dd/MM/yyyy a'))).toBe('CLOCK_INVALID_PATTERN')
  })
  it('round-trips every new token in a lossless pattern', () => {
    const pattern = "EEEE d MMMM yyyy 'at' h:mm:ss.SSS a"
    const value = parse('localDateTime', '2026-11-08T17:05:09.120')
    const text = formatPattern(value, pattern)
    expect(text).toBe('Sunday 8 November 2026 at 5:05:09.120 pm')
    expect(parsePattern('localDateTime', text, pattern).value).toBe('2026-11-08T17:05:09.120')
  })
})
