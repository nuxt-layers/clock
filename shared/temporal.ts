// The only place Clock chooses its Temporal implementation. Moving to native Temporal
// changes this file alone; no Temporal type crosses the public contract.
export { Temporal } from '@js-temporal/polyfill'
