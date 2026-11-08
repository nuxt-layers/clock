import { Temporal } from './temporal'
import { ClockError, parse, type Value } from './core'

export type InterchangeFormat =
  | 'rfc3339' | 'numericDate' | 'epochMilliseconds' | 'httpDate'
  | 'rfc5322' | 'iso8601Basic' | 'asn1UtcTime' | 'asn1GeneralizedTime'

const formats: readonly InterchangeFormat[] = ['rfc3339', 'numericDate', 'epochMilliseconds', 'httpDate', 'rfc5322', 'iso8601Basic', 'asn1UtcTime', 'asn1GeneralizedTime']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const longDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const zones: Record<string, string> = { UT: '+00:00', GMT: '+00:00', EST: '-05:00', EDT: '-04:00', CST: '-06:00', CDT: '-05:00', MST: '-07:00', MDT: '-06:00', PST: '-08:00', PDT: '-07:00' }
const M = months.join('|')
const D = days.join('|')

const invalidInput = (): never => { throw new ClockError('CLOCK_INVALID_INPUT') }
const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** Resolves fields with an explicit offset to a canonical instant; rejects impossible dates and out-of-range years. */
function instant(date: string, time: string, offset: string, weekday?: number): Value {
  if (time.slice(6, 8) === '60') return invalidInput() // leap seconds are rejected, as in canonical parsing
  let value: string
  try {
    const parsed = Temporal.Instant.from(`${date}T${time}${offset}`)
    if (weekday !== undefined && Temporal.PlainDate.from(date, { overflow: 'reject' }).dayOfWeek !== weekday) return invalidInput()
    value = parsed.toString()
  } catch (e) {
    if (e instanceof ClockError) throw e
    return invalidInput()
  }
  return parse('instant', value)
}
function fromEpoch(ns: bigint): Value {
  let value: string
  try { value = Temporal.Instant.fromEpochNanoseconds(ns).toString() } catch { return invalidInput() }
  return parse('instant', value)
}
const month = (name: string) => pad(months.indexOf(name) + 1)
const day = (name: string, list = days) => list.indexOf(name) + 1

function decimalNanoseconds(text: string, scale: number): bigint {
  const match = /^(-?)([0-9]{1,16})(?:\.([0-9]{1,9}))?$/.exec(text)
  if (!match || (scale !== 9 && match[3] !== undefined)) return invalidInput()
  const [, sign, whole, fraction = ''] = match
  const ns = BigInt(whole!) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(9, '0'))
  return sign ? -ns : ns
}
function numeric(input: string | number, integerOnly: boolean): string {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || (integerOnly && !Number.isSafeInteger(input))) return invalidInput()
    const text = String(input)
    return /e/i.test(text) ? invalidInput() : text
  }
  return typeof input === 'string' ? input : invalidInput()
}

export function parseInterchangeAt(format: InterchangeFormat, input: string | number, currentYear: number): Value {
  if (!formats.includes(format)) throw new ClockError('CLOCK_UNSUPPORTED_OPERATION')
  if (format === 'numericDate') return fromEpoch(decimalNanoseconds(numeric(input, false), 9))
  if (format === 'epochMilliseconds') return fromEpoch(decimalNanoseconds(numeric(input, true), 6))
  if (typeof input !== 'string' || input.length > 64) return invalidInput()
  let m: RegExpExecArray | null
  switch (format) {
    case 'rfc3339':
      m = /^([0-9]{4}-[0-9]{2}-[0-9]{2})[Tt]([0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?)([Zz]|[+-][0-9]{2}:[0-9]{2})$/.exec(input)
      return m ? instant(m[1]!, m[2]!, m[3]!.toUpperCase()) : invalidInput()
    case 'httpDate':
      if ((m = new RegExp(`^(${D}), ([0-9]{2}) (${M}) ([0-9]{4}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) GMT$`).exec(input)))
        return instant(`${m[4]}-${month(m[3]!)}-${m[2]}`, m[5]!, 'Z', day(m[1]!))
      if ((m = new RegExp(`^(${longDays.join('|')}), ([0-9]{2})-(${M})-([0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) GMT$`).exec(input))) {
        // RFC 9110 §5.6.7: a two-digit year more than 50 years ahead belongs to the previous century.
        let year = Math.floor(currentYear / 100) * 100 + Number(m[4])
        if (year > currentYear + 50) year -= 100
        return instant(`${pad(year, 4)}-${month(m[3]!)}-${m[2]}`, m[5]!, 'Z', day(m[1]!, longDays))
      }
      if ((m = new RegExp(`^(${D}) (${M}) ( [1-9]|[0-9]{2}) ([0-9]{2}:[0-9]{2}:[0-9]{2}) ([0-9]{4})$`).exec(input)))
        return instant(`${m[5]}-${month(m[2]!)}-${m[3]!.trim().padStart(2, '0')}`, m[4]!, 'Z', day(m[1]!))
      return invalidInput()
    case 'rfc5322':
      m = new RegExp(`^(?:(${D}), )?([0-9]{1,2}) (${M}) ([0-9]{4}) ([0-9]{2}:[0-9]{2})(:[0-9]{2})? ([+-][0-9]{4}|${Object.keys(zones).join('|')})$`).exec(input)
      if (!m) return invalidInput()
      return instant(`${m[4]}-${month(m[3]!)}-${m[2]!.padStart(2, '0')}`, m[5]! + (m[6] ?? ':00'),
        zones[m[7]!] ?? `${m[7]!.slice(0, 3)}:${m[7]!.slice(3)}`, m[1] ? day(m[1]) : undefined)
    case 'iso8601Basic':
    case 'asn1GeneralizedTime':
      m = (format === 'iso8601Basic' ? /^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$/ : /^([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})Z$/).exec(input)
      return m ? instant(`${m[1]}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}:${m[6]}`, 'Z') : invalidInput()
    case 'asn1UtcTime': {
      m = /^([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})Z$/.exec(input)
      if (!m) return invalidInput()
      // RFC 5280 §4.1.2.5.1: fixed pivot, not relative to the current date.
      const year = Number(m[1]) >= 50 ? 1900 + Number(m[1]) : 2000 + Number(m[1])
      return instant(`${year}-${m[2]}-${m[3]}`, `${m[4]}:${m[5]}:${m[6]}`, 'Z')
    }
  }
  return invalidInput()
}

export function formatInterchange(value: Value, format: InterchangeFormat): string | number {
  if (!formats.includes(format)) throw new ClockError('CLOCK_UNSUPPORTED_OPERATION')
  if (!value || typeof value !== 'object' || (value.kind !== 'instant' && value.kind !== 'zonedDateTime')) throw new ClockError('CLOCK_INCOMPATIBLE_TYPES')
  const canonical = parse(value.kind, value.value).value
  if (format === 'rfc3339') return value.kind === 'instant' ? canonical : canonical.slice(0, canonical.indexOf('['))
  const exact = value.kind === 'instant' ? Temporal.Instant.from(canonical) : Temporal.ZonedDateTime.from(canonical).toInstant()
  const floorDiv = (a: bigint, b: bigint) => (a >= 0n ? a / b : -((-a + b - 1n) / b))
  if (format === 'numericDate') return Number(floorDiv(exact.epochNanoseconds, 1_000_000_000n))
  if (format === 'epochMilliseconds') return Number(floorDiv(exact.epochNanoseconds, 1_000_000n))
  const u = exact.toZonedDateTimeISO('UTC')
  const date = `${pad(u.year, 4)}${pad(u.month)}${pad(u.day)}`
  const time = `${pad(u.hour)}${pad(u.minute)}${pad(u.second)}`
  const clock = `${pad(u.hour)}:${pad(u.minute)}:${pad(u.second)}`
  const named = `${days[u.dayOfWeek - 1]}, ${pad(u.day)} ${months[u.month - 1]} ${pad(u.year, 4)} ${clock}`
  switch (format) {
    case 'httpDate': return `${named} GMT`
    case 'rfc5322': return `${named} +0000`
    case 'iso8601Basic': return `${date}T${time}Z`
    case 'asn1GeneralizedTime': return `${date}${time}Z`
    case 'asn1UtcTime':
      if (u.year < 1950 || u.year > 2049) throw new ClockError('CLOCK_INVALID_INPUT')
      return `${date.slice(2)}${time}Z`
  }
  throw new ClockError('CLOCK_UNSUPPORTED_OPERATION')
}
