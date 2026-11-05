import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      clock: {
        locale: 'en-GB',
        timeZone: 'UTC',
        hourCycle: 'h23',
      },
    },
  },
})
