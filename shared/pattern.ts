import { Temporal } from './temporal'
import { ClockError, parse, type Value } from './core'

export type PatternKind = 'date' | 'time' | 'localDateTime'
export type PatternOptions = { century?: number }

type Field = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'fraction' | 'weekday' | 'meridiem'
type Style = 'fixed' | 'variable' | 'monthName' | 'weekdayName' | 'meridiem'
type Token = { token: string; field: Field; width: number; style: Style; long?: boolean; twelve?: boolean }
type Part = { literal: string } | Token
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
// Longest first, so `MMMM` wins over `MMM`, `MM` and `M`.
const tokens: ReadonlyArray<Token> = [
  { token: 'yyyy', field: 'year', width: 4, style: 'fixed' }, { token: 'yy', field: 'year', width: 2, style: 'fixed' },
  { token: 'MMMM', field: 'month', width: 0, style: 'monthName', long: true }, { token: 'MMM', field: 'month', width: 0, style: 'monthName' },
  { token: 'MM', field: 'month', width: 2, style: 'fixed' }, { token: 'M', field: 'month', width: 2, style: 'variable' },
  { token: 'EEEE', field: 'weekday', width: 0, style: 'weekdayName', long: true }, { token: 'EEE', field: 'weekday', width: 0, style: 'weekdayName' },
  { token: 'dd', field: 'day', width: 2, style: 'fixed' }, { token: 'd', field: 'day', width: 2, style: 'variable' },
  { token: 'HH', field: 'hour', width: 2, style: 'fixed' }, { token: 'H', field: 'hour', width: 2, style: 'variable' },
  { token: 'hh', field: 'hour', width: 2, style: 'fixed', twelve: true }, { token: 'h', field: 'hour', width: 2, style: 'variable', twelve: true },
  { token: 'mm', field: 'minute', width: 2, style: 'fixed' }, { token: 'ss', field: 'second', width: 2, style: 'fixed' },
  { token: 'SSS', field: 'fraction', width: 3, style: 'fixed' }, { token: 'SS', field: 'fraction', width: 2, style: 'fixed' },
  { token: 'S', field: 'fraction', width: 1, style: 'fixed' }, { token: 'a', field: 'meridiem', width: 0, style: 'meridiem' },
]
const invalidPattern = (): never => { throw new ClockError('CLOCK_INVALID_PATTERN') }
const invalidInput = (): never => { throw new ClockError('CLOCK_INVALID_INPUT') }
const invalidConfig = (): never => { throw new ClockError('CLOCK_INVALID_CONFIG') }
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const names = (list: string[], long?: boolean) => long ? list : list.map(name => name.slice(0, 3))
const anyCase = (text: string) => text.replace(/[a-z]/gi, c => `[${c.toUpperCase()}${c.toLowerCase()}]`)
const numeric = (part: Part) => 'token' in part && (part.style === 'fixed' || part.style === 'variable')

function source(part: Token): string {
  switch (part.style) {
    case 'fixed': return '([0-9]{' + part.width + '})'
    case 'variable': return '([0-9]{1,2})'
    case 'monthName': return '(' + names(MONTHS, part.long).map(anyCase).join('|') + ')'
    case 'weekdayName': return '(' + names(WEEKDAYS, part.long).map(anyCase).join('|') + ')'
    case 'meridiem': return '(' + anyCase('am') + '|' + anyCase('pm') + ')'
  }
}

function compile(kind: PatternKind, pattern: string) {
  if (!['date', 'time', 'localDateTime'].includes(kind) || typeof pattern !== 'string' || !pattern || pattern.length > 128) return invalidPattern()
  const parts: Part[] = []
  const seen = new Set<Field>()
  let i = 0
  while (i < pattern.length) {
    if (pattern[i] === "'") {
      if (pattern[i + 1] === "'") { parts.push({ literal: "'" }); i += 2; continue }
      i++
      let literal = ''
      let closed = false
      while (i < pattern.length) {
        if (pattern[i] === "'" && pattern[i + 1] === "'") { literal += "'"; i += 2; continue }
        if (pattern[i] === "'") { i++; closed = true; break }
        literal += pattern[i++]
      }
      if (!closed || !literal) return invalidPattern()
      parts.push({ literal })
      continue
    }
    const token = tokens.find(({ token: name }) => pattern.startsWith(name, i))
    if (token) {
      if (seen.has(token.field)) return invalidPattern()
      seen.add(token.field)
      parts.push(token)
      i += token.token.length
      continue
    }
    const char = pattern[i++]!
    if (!/^[\/\-:. ,T]$/.test(char)) return invalidPattern()
    parts.push({ literal: char })
  }
  // A one-or-two-digit field next to another number cannot be split unambiguously.
  for (let p = 1; p < parts.length; p++) {
    const [a, b] = [parts[p - 1]!, parts[p]!]
    if (numeric(a) && numeric(b) && ((a as Token).style === 'variable' || (b as Token).style === 'variable')) return invalidPattern()
  }
  const twelve = parts.some(p => 'token' in p && p.twelve)
  if (twelve !== seen.has('meridiem')) return invalidPattern()
  const date = ['year', 'month', 'day'] as const
  const time = ['hour', 'minute', 'second'] as const
  // Seconds are optional; fractions need seconds.
  const required = kind === 'date' ? date : kind === 'time' ? ['hour', 'minute'] as const : [...date, 'hour', 'minute'] as const
  if (required.some(field => !seen.has(field))) return invalidPattern()
  if (seen.has('fraction') && !seen.has('second')) return invalidPattern()
  if (kind === 'date' && [...time, 'fraction', 'meridiem'].some(field => seen.has(field as Field))) return invalidPattern()
  if (kind === 'time' && [...date, 'weekday'].some(field => seen.has(field as Field))) return invalidPattern()
  const expression = '^' + parts.map(part => 'literal' in part ? escapeRegex(part.literal) : source(part)).join('') + '$'
  return { parts, expression: new RegExp(expression), hasShortYear: parts.some(p => 'token' in p && p.token === 'yy') }
}

function validateOptions(options: PatternOptions, shortYear: boolean): number | undefined {
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(k => k !== 'century')) return invalidConfig()
  const century = options.century
  if (shortYear && (!Number.isSafeInteger(century) || century! < 0 || century! > 9900 || century! % 100 !== 0)) return invalidConfig()
  if (century !== undefined && (!Number.isSafeInteger(century) || century < 0 || century > 9900 || century % 100 !== 0)) return invalidConfig()
  return century
}

export function parsePattern(kind: PatternKind, input: string, pattern: string, options: PatternOptions = {}): Value {
  const compiled = compile(kind, pattern)
  const century = validateOptions(options, compiled.hasShortYear)
  if (typeof input !== 'string' || input.length > 256) return invalidInput()
  const match = compiled.expression.exec(input)
  if (!match) return invalidInput()
  const fields: Partial<Record<Field, string>> = {}
  let capture = 1
  let twelve = false
  for (const part of compiled.parts) {
    if (!('token' in part)) continue
    const raw = match[capture++]!
    if (part.style === 'monthName') fields.month = String(names(MONTHS, part.long).findIndex(n => n.toLowerCase() === raw.toLowerCase()) + 1)
    else if (part.style === 'weekdayName') fields.weekday = String(names(WEEKDAYS, part.long).findIndex(n => n.toLowerCase() === raw.toLowerCase()) + 1)
    else if (part.style === 'meridiem') fields.meridiem = raw.toLowerCase()
    else fields[part.field] = raw
    if (part.twelve) twelve = true
  }
  if (twelve) {
    const hour = Number(fields.hour)
    if (hour < 1 || hour > 12) return invalidInput()
    fields.hour = String((hour % 12) + (fields.meridiem === 'pm' ? 12 : 0))
  }
  const two = (v?: string) => v === undefined ? v : v.padStart(2, '0')
  const year = compiled.hasShortYear ? String(century! + Number(fields.year)).padStart(4, '0') : fields.year
  const date = `${year}-${two(fields.month)}-${two(fields.day)}`
  const time = `${two(fields.hour)}:${fields.minute}:${fields.second ?? '00'}${fields.fraction === undefined ? '' : '.' + fields.fraction}`
  const value = parse(kind, kind === 'date' ? date : kind === 'time' ? time : date + 'T' + time)
  if (fields.weekday !== undefined && Temporal.PlainDate.from(date).dayOfWeek !== Number(fields.weekday)) return invalidInput()
  return value
}

export function formatPattern(value: Value, pattern: string): string {
  const kind = value?.kind as PatternKind
  const compiled = compile(kind, pattern)
  const canonical = parse(kind, value.value).value
  const date = kind === 'time' ? '' : canonical.slice(0, 10)
  const time = kind === 'date' ? '' : kind === 'time' ? canonical : canonical.slice(11)
  const fields: Record<Field, string> = {
    year: date.slice(0, 4), month: date.slice(5, 7), day: date.slice(8, 10),
    hour: time.slice(0, 2), minute: time.slice(3, 5), second: time.slice(6, 8),
    fraction: (time.split('.')[1] ?? '').padEnd(9, '0'), weekday: '', meridiem: '',
  }
  const hour = Number(fields.hour)
  const weekday = kind === 'time' ? 0 : Temporal.PlainDate.from(date).dayOfWeek
  return compiled.parts.map(part => {
    if ('literal' in part) return part.literal
    if (part.token === 'yy') return fields.year.slice(-2)
    switch (part.style) {
      case 'monthName': return names(MONTHS, part.long)[Number(fields.month) - 1]!
      case 'weekdayName': return names(WEEKDAYS, part.long)[weekday - 1]!
      case 'meridiem': return hour < 12 ? 'am' : 'pm'
    }
    const value = part.twelve ? String(hour % 12 || 12).padStart(2, '0') : fields[part.field]
    return part.style === 'variable' ? String(Number(value)) : value.slice(0, part.width)
  }).join('')
}
