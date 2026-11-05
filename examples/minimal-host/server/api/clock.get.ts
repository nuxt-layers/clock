import { defineEventHandler } from 'nuxt/server'
import { useServerClock } from '@nuxt-layers/clock/server'

export default defineEventHandler(() => {
  const clock = useServerClock()
  return {
    now: clock.now(),
    today: clock.today(),
    timeZone: 'Europe/London',
  }
})
