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
</script>

<template>
  <main>
    <h1>Clock consumer</h1>
    <time :datetime="restored.value">{{ formattedDate }}</time>
  </main>
</template>
