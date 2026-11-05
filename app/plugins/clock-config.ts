import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { ClockError, createClock, type ClockSettings } from '../../shared/core'

/** Validate application defaults during Nuxt initialisation on both SSR and client. */
export default defineNuxtPlugin(() => {
  try {
    createClock(useRuntimeConfig().public.clock as ClockSettings)
  } catch {
    throw new ClockError('CLOCK_INVALID_CONFIG')
  }
})
