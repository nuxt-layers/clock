import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { createClock } from '@nuxt-layers/clock/core'
import { mockConfigurationAnswer } from '../shared/mock-configuration'

describe('Clock minimal host', async () => {
  await setup({ rootDir: fileURLToPath(new URL('..', import.meta.url)) })

  it('renders the composable during SSR', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('Clock consumer')
    expect(html).toContain('2026-11-05')
    expect(html).toContain('05/11/2026')
  })

  it('exposes a host-owned Nitro route using the server entry', async () => {
    const response = await $fetch<{ now: string; today: string; timeZone: string; formattedDate: string }>('/api/clock')
    expect(response.now).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/)
    expect(response.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(response.timeZone).toBe('Europe/London')
    expect(response.formattedDate).toBe('05/11/2026')
  })
  it('uses independent mocked scoped Configuration responses', () => {
    const initial = mockConfigurationAnswer()
    const tenantOverride = mockConfigurationAnswer({ datePattern: 'yyyy/MM/dd', timeZone: 'UTC' })
    const date = createClock().parse('date', '2026-11-05')
    expect(createClock(initial).formatPattern(date, initial.datePattern)).toBe('05/11/2026')
    expect(createClock(tenantOverride).formatPattern(date, tenantOverride.datePattern)).toBe('2026/11/05')
    expect(createClock(initial).parsePattern('date', '05/11/2026', initial.datePattern)).toEqual(date)
  })

  it('rejects an invalid mock preference before accepting its output', () => {
    const broken = mockConfigurationAnswer({ datePattern: 'dd/MMMMM/yyyy' })
    const clock = createClock(broken)
    expect(() => clock.formatPattern(clock.parse('date', '2026-11-05'), broken.datePattern))
      .toThrowError('CLOCK_INVALID_PATTERN')
    expect(() => createClock(mockConfigurationAnswer({ timeZone: 'Invalid/Zone' })))
      .toThrowError('CLOCK_INVALID_TIME_ZONE')
  })
})
