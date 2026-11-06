import { defineEventHandler } from 'nuxt/server'
import { useServerClock } from '@nuxt-layers/clock/server'
import { mockConfigurationAnswer } from '#shared/mock-configuration'

export default defineEventHandler(() => {
  const preferences = mockConfigurationAnswer()
  const clock = useServerClock({
    locale: preferences.locale,
    timeZone: preferences.timeZone,
    hourCycle: preferences.hourCycle,
  })
  return {
    now: clock.now(),
    today: clock.today(),
    timeZone: preferences.timeZone,
    formattedDate: clock.formatPattern(clock.parse('date', '2026-11-05'), preferences.datePattern),
  }
})
