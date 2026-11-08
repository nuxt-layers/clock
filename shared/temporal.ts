// The only place Clock chooses its Temporal implementation: the runtime's native Temporal.
// Every supported runtime has it (Node.js 26.13+, current Chromium, Firefox and WebKit).
// `@js-temporal/polyfill` supplies type definitions only, until TypeScript ships them;
// `import type` is erased, so no polyfill code is loaded or bundled.
import type { Temporal as TemporalTypes } from '@js-temporal/polyfill'

const native = (globalThis as { Temporal?: typeof TemporalTypes }).Temporal
if (!native) throw new Error('Clock requires native Temporal: Node.js 26.13 or later, or a current Chromium, Firefox or WebKit browser.')

export const Temporal: typeof TemporalTypes = native
export type { TemporalTypes }
