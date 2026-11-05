import { useRuntimeConfig } from '#imports'
import { createClock, type ClockPort, type ClockSettings } from '../../shared/core'

/**
 * Uses the same public defaults during SSR and hydration.
 * Callers may override preferences without mutating application-wide settings.
 */
export function useClock(overrides: ClockSettings = {}, provider?: ClockPort) {
  const config = useRuntimeConfig()
  const defaults = config.public.clock as ClockSettings
  return createClock({ ...defaults, ...overrides }, provider)
}
