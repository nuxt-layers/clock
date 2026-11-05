import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  extends: ['@nuxt-layers/clock'],
  runtimeConfig: {
    public: {
      clock: {
        locale: 'en-GB',
        timeZone: 'Europe/London',
        hourCycle: 'h23',
      },
    },
  },
})
