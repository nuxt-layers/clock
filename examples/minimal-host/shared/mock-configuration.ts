// Host-owned test double: equivalent to Configuration's resolved, authorised values.
// Neither Clock nor this host example imports the Configuration layer.
export type ClockPresentationPreferences = { locale: string; timeZone: string; hourCycle: 'h11' | 'h12' | 'h23' | 'h24'; datePattern: string; timePattern: string; dateTimePattern: string }
const defaults: ClockPresentationPreferences = {
  locale: 'en-GB', timeZone: 'Europe/London', hourCycle: 'h23',
  datePattern: 'dd/MM/yyyy', timePattern: 'HH:mm:ss', dateTimePattern: 'dd/MM/yyyy HH:mm:ss',
}
export function mockConfigurationAnswer(overrides: Partial<ClockPresentationPreferences> = {}): ClockPresentationPreferences {
  return { ...defaults, ...overrides }
}
