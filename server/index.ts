import { useRuntimeConfig } from 'nuxt/server'
import { createClock, type ClockPort, type ClockSettings } from '../shared/core'

/**
 * Call inside a Nitro request handler. Never caches a caller's clock,
 * settings or injected provider between requests.
 */
export function useServerClock(overrides: ClockSettings = {}, provider?: ClockPort) {
  const config = useRuntimeConfig()
  const defaults = config.public.clock as ClockSettings
  return createClock({ ...defaults, ...overrides }, provider)
}

export { createClock }
export type { ClockPort, ClockSettings }
