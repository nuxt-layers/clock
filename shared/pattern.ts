import { ClockError, parse, type Value } from './core'

export type PatternKind = 'date' | 'time' | 'localDateTime'
export type PatternOptions = { century?: number }

type Field = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'fraction'
type Part = { literal: string } | { token: string; field: Field; width: number }
const tokens: ReadonlyArray<readonly [string, Field, number]> = [
  ['yyyy', 'year', 4], ['yy', 'year', 2], ['SSS', 'fraction', 3],
  ['MM', 'month', 2], ['dd', 'day', 2], ['HH', 'hour', 2],
  ['mm', 'minute', 2], ['ss', 'second', 2], ['SS', 'fraction', 2], ['S', 'fraction', 1],
]
const invalidPattern = (): never => { throw new ClockError('CLOCK_INVALID_PATTERN') }
const invalidInput = (): never => { throw new ClockError('CLOCK_INVALID_INPUT') }
const invalidConfig = (): never => { throw new ClockError('CLOCK_INVALID_CONFIG') }
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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
    const token = tokens.find(([name]) => pattern.startsWith(name, i))
    if (token) {
      const [name, field, width] = token
      if (seen.has(field)) return invalidPattern()
      seen.add(field)
      parts.push({ token: name, field, width })
      i += name.length
      continue
    }
    const char = pattern[i++]!
    if (!/^[\/\-:. ,T]$/.test(char)) return invalidPattern()
    parts.push({ literal: char })
  }
  const date = ['year', 'month', 'day'] as const
  const time = ['hour', 'minute', 'second'] as const
  const required = kind === 'date' ? date : kind === 'time' ? time : [...date, ...time]
  if (required.some(field => !seen.has(field))) return invalidPattern()
  if (kind === 'date' && [...time, 'fraction'].some(field => seen.has(field as Field))) return invalidPattern()
  if (kind === 'time' && date.some(field => seen.has(field))) return invalidPattern()
  const expression = '^' + parts.map(part => 'literal' in part ? escapeRegex(part.literal) : '([0-9]{' + part.width + '})').join('') + '$'
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
  if (typeof input !== 'string') return invalidInput()
  const match = compiled.expression.exec(input)
  if (!match) return invalidInput()
  const fields: Partial<Record<Field, string>> = {}
  let capture = 1
  for (const part of compiled.parts) {
    if ('token' in part) fields[part.field] = match[capture++]
  }
  const year = compiled.hasShortYear ? String(century! + Number(fields.year)).padStart(4, '0') : fields.year
  const date = `${year}-${fields.month}-${fields.day}`
  const time = `${fields.hour}:${fields.minute}:${fields.second}${fields.fraction === undefined ? '' : '.' + fields.fraction}`
  return parse(kind, kind === 'date' ? date : kind === 'time' ? time : date + 'T' + time)
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
    fraction: (time.split('.')[1] ?? '').padEnd(9, '0'),
  }
  return compiled.parts.map(part => {
    if ('literal' in part) return part.literal
    if (part.token === 'yy') return fields.year.slice(-2)
    return fields[part.field].slice(0, part.width)
  }).join('')
}
