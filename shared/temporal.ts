// Clock uses the runtime's native Temporal, with types from TypeScript's `esnext.temporal` lib.
// Every supported runtime has it (Node.js 26.13+, current Chromium, Firefox and WebKit).
// Imported first by each module that uses Temporal, so an unsupported runtime fails at once
// with a clear message instead of a ReferenceError later.
if (typeof globalThis.Temporal === 'undefined') {
  throw new Error('Clock requires native Temporal: Node.js 26.13 or later, or a current Chromium, Firefox or WebKit browser.')
}
export {}
