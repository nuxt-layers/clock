import { describe, expect, it } from 'vitest'
import * as core from '../shared/core'
import * as server from '../server/index'

// Contract tests for what each public entry point exports: CONTRACT.md "Public source exports".
describe('ClockError is importable from each public entry point', () => {
  it('exports the same class from /core and /server', () => {
    expect(typeof core.ClockError).toBe('function')
    expect(server.ClockError).toBe(core.ClockError)
  })

  it('an error from a /server clock is instanceof the /core class, with a stable code', () => {
    const clock = server.createClock({}, { now: () => { throw new Error('provider down') } })
    try {
      clock.now()
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(core.ClockError)
      expect(error).toBeInstanceOf(server.ClockError)
      expect((error as core.ClockError).code).toBe('CLOCK_INVALID_INPUT')
      expect((error as core.ClockError).name).toBe('ClockError')
    }
  })
})

describe('time-zone validation and listing', () => {
  it('accepts IANA names, links, UTC and Etc zones exactly as given', () => {
    for (const name of ['Europe/London', 'America/Argentina/Buenos_Aires', 'Europe/Kiev', 'Europe/Kyiv', 'UTC', 'Etc/UTC', 'Etc/GMT+5'])
      expect(core.isValidTimeZone(name), name).toBe(true)
  })

  it('rejects offsets, unknown, empty, mis-cased and non-string names without throwing', () => {
    for (const name of ['+01:00', '-05:00', 'Z', '', ' ', 'Invalid/Zone', 'europe/london', 'Europe/London ', 'Europe/London[x]', 'a'.repeat(65), null, undefined, 42, {}])
      expect(core.isValidTimeZone(name as string), String(name)).toBe(false)
  })

  it('lists sorted canonical zones, including UTC, each accepted by isValidTimeZone and toZone', () => {
    const zones = core.timeZones()
    expect(zones.length).toBeGreaterThan(300)
    expect(zones).toContain('UTC')
    expect(zones).toContain('Europe/London')
    expect(zones).toContain('Europe/Kyiv') // IANA's spelling, whatever the engine lists
    expect(zones).toContain('Africa/Asmara')
    expect(zones).not.toContain('Europe/Kiev')
    expect(zones).not.toContain('Etc/UTC') // a link, so not listed, although isValidTimeZone accepts it
    expect([...zones]).toEqual([...zones].sort())
    expect(new Set(zones).size).toBe(zones.length)
    expect(Object.isFrozen(zones)).toBe(true)
    for (const name of zones) {
      expect(core.isValidTimeZone(name), name).toBe(true)
      expect(() => core.toZone('2026-01-01T00:00:00Z', name)).not.toThrow()
    }
  })

  it('is exposed on clock instances and the /server entry', () => {
    const clock = core.createClock()
    expect(clock.isValidTimeZone('Europe/London')).toBe(true)
    expect(clock.timeZones()).toBe(core.timeZones())
    expect(server.isValidTimeZone).toBe(core.isValidTimeZone)
    expect(server.timeZones).toBe(core.timeZones)
  })

  it('operations that take a zone reject one that isValidTimeZone rejects', () => {
    expect(() => core.toZone('2026-01-01T00:00:00Z', 'europe/london')).toThrowError('CLOCK_INVALID_TIME_ZONE')
    expect(() => core.createClock({ timeZone: '+01:00' })).toThrowError('CLOCK_INVALID_TIME_ZONE')
  })
})

// CONTRACT.md "Deadlines across daylight saving": calendar days on a zoned value in a zone the
// caller states, with `compatible` disambiguation.
describe('recommended deadline arithmetic across Europe/London DST', () => {
  const deadline = (start: string, zone: string, amount: core.DateUnits) =>
    core.toInstant(core.add({ kind: 'zonedDateTime', value: core.toZone(start, zone) }, amount, { disambiguation: 'compatible' }).value)

  it('keeps the local time across the spring change', () => {
    // 10:00 GMT on 25 March + 7 days = 10:00 BST on 1 April (23 hours earlier in UTC terms than 168 hours)
    expect(deadline('2026-03-25T10:00:00Z', 'Europe/London', { days: 7 })).toBe('2026-04-01T09:00:00Z')
  })

  it('keeps the local time across the autumn change', () => {
    // 10:00 BST on 20 October + 7 days = 10:00 GMT on 27 October
    expect(deadline('2026-10-20T09:00:00Z', 'Europe/London', { days: 7 })).toBe('2026-10-27T10:00:00Z')
  })

  it('does not throw when the result lands in the spring gap', () => {
    // 01:30 GMT on 28 March + 1 day = 01:30 on 29 March, which does not exist; compatible gives 02:30 BST
    expect(deadline('2026-03-28T01:30:00Z', 'Europe/London', { days: 1 })).toBe('2026-03-29T01:30:00Z')
  })

  it('does not throw in the autumn overlap and picks the earlier instant', () => {
    // 01:30 BST on 24 October + 1 day = 01:30 on 25 October, which happens twice
    expect(deadline('2026-10-24T00:30:00Z', 'Europe/London', { days: 1 })).toBe('2026-10-25T00:30:00Z')
  })

  it('adds one calendar month, clamping to the month end', () => {
    expect(deadline('2026-03-01T12:00:00Z', 'Europe/London', { months: 1 })).toBe('2026-04-01T11:00:00Z')
    expect(deadline('2026-01-31T12:00:00Z', 'Europe/London', { months: 1 })).toBe('2026-02-28T12:00:00Z')
  })

  it('end of the local day N days later', () => {
    const clock = core.createClock({}, { now: () => '2026-10-20T15:00:00Z' })
    const due = core.add(core.parse('date', clock.today('Europe/London')), { days: 8 }).value
    const endOfDay = core.toInstant(core.resolveLocal(`${due}T00:00:00`, 'Europe/London', 'compatible'))
    expect(endOfDay).toBe('2026-10-28T00:00:00Z') // deadline is before midnight starting 28 October
  })
})
