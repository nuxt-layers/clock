# Plan

> **In short:** approve the clock interface, then implement and verify it against a minimal consuming Nuxt application.

| Stage | Status | Acceptance |
|---|---|---|
| Define boundaries and draft consumer contract | Completed in PR #1 | Review classification, types, settings and public entry points |
| Specify temporal semantics | Completed | Precision, arithmetic, DST, export names and error policy documented and tested |
| Implement pure core | Accepted | 19 core tests, error-contract and temporal-boundary coverage, typecheck and CI passed |
| Integrate Nuxt and Nitro | Accepted | Nuxt layer, composable and Nitro helper passed host tests, build and typecheck in CI |
| Prove consumption | Accepted | Local and independent Git-backed consumers passed frozen installs, SSR/Nitro tests, builds and typechecks; composition 26/50 lines |
| Reconcile documentation | In review | Final acceptance and current development consumption reflected in contract and README |
| Update ecosystem catalogue | Planned | Replace candidate `clock-service` with a one-line Foundation `clock` entry in a separate architecture-rules PR |
