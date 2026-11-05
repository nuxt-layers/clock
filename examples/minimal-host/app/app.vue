<script setup lang="ts">
const clock = useClock()
const formattedDate = clock.format(clock.parse('date', '2026-11-05'))
</script>

<template>
  <main>
    <h1>Clock consumer</h1>
    <time datetime="2026-11-05">{{ formattedDate }}</time>
  </main>
</template>
