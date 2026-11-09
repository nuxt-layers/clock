<script setup lang="ts">
import { mockConfigurationAnswer } from '#shared/mock-configuration'

// Mocked resolved viewer settings: identical for the initial SSR and hydration.
const preferences = mockConfigurationAnswer()
const clock = useClock({
  locale: preferences.locale,
  timeZone: preferences.timeZone,
  hourCycle: preferences.hourCycle,
})
const date = clock.parse('date', '2026-11-05')
const formattedDate = clock.formatPattern(date, preferences.datePattern)
const restored = clock.parsePattern('date', formattedDate, preferences.datePattern)

// Runtime probe for tests/browsers.mjs: deterministic results computed during SSR and again
// in each browser during hydration, so any engine difference is a hydration mismatch.
// Localised `format` output is excluded because Intl wording may differ between engines.
const instant = clock.parse('instant', '2026-03-29T00:30:00.123456789Z')
const autumn = '2026-10-25T01:30:00'
const probe = JSON.stringify({
  nanoseconds: clock.serialise(clock.add(instant, { seconds: 1 })),
  zone: clock.toZone(instant.value, 'Europe/London'),
  springGap: clock.resolveLocal('2026-03-29T01:30:00', 'Europe/London', 'compatible'),
  autumnEarlier: clock.resolveLocal(autumn, 'Europe/London', 'earlier'),
  autumnLater: clock.resolveLocal(autumn, 'Europe/London', 'later'),
  farZone: clock.toZone('2026-11-08T17:00:00Z', 'Pacific/Kiritimati'),
  tzdata2024a: clock.toZone('2026-07-01T00:00:00Z', 'Asia/Almaty'),
  tzdata2024b: clock.toZone('2026-07-01T00:00:00Z', 'America/Asuncion'),
  halfHourDst: clock.toZone('2026-07-01T00:00:00Z', 'Australia/Lord_Howe'),
  leapDay: clock.add(clock.parse('date', '2028-01-31'), { months: 1 }).value,
  pattern: clock.formatPattern(clock.parse('localDateTime', '2026-11-08T17:05:09.120'), "EEEE d MMMM yyyy 'at' h:mm:ss.SSS a"),
  parsedPattern: clock.parsePattern('time', '5:30 PM', 'h:mm a').value,
  httpDate: clock.formatInterchange(instant, 'httpDate'),
  numericDate: clock.formatInterchange(instant, 'numericDate'),
  rfc850: clock.parseInterchange('httpDate', 'Sunday, 06-Nov-94 08:49:37 GMT').value,
  utcTime: clock.parseInterchange('asn1UtcTime', '491231235959Z').value,
  timeZones: clock.timeZones().join(' '),
  zoneChecks: ['Europe/Kiev', 'Etc/UTC', 'europe/london', '+01:00'].map(clock.isValidTimeZone),
})
</script>

<template>
  <main>
    <h1>Clock consumer</h1>
    <time :datetime="restored.value">{{ formattedDate }}</time>
    <pre data-runtime-probe>{{ probe }}</pre>
  </main>
</template>
