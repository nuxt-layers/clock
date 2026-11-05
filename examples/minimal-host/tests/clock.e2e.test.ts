import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('Clock minimal host', async () => {
  await setup({ rootDir: fileURLToPath(new URL('..', import.meta.url)) })

  it('renders the composable during SSR', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('Clock consumer')
    expect(html).toContain('2026-11-05')
  })

  it('exposes a host-owned Nitro route using the server entry', async () => {
    const response = await $fetch<{ now: string; today: string; timeZone: string }>('/api/clock')
    expect(response.now).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/)
    expect(response.today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(response.timeZone).toBe('Europe/London')
  })
})
