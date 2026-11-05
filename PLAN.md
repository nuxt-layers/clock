# Plan

> **In short:** approve the clock interface, then implement and verify it against a minimal consuming Nuxt application.

| Stage | Status | Acceptance |
|---|---|---|
| Define boundaries and draft consumer contract | Completed in PR #1 | Review classification, types, settings and public entry points |
| Specify temporal semantics | Completed in PR #2 | Precision, arithmetic, DST, export names and error policy documented; awaiting review |
| Implement pure core | Locally validated | 10/10 core tests and root typecheck passed; CI acceptance remains outstanding |
| Integrate Nuxt and Nitro | Locally validated | Layer entry, composable and Nitro helper passed minimal-host build/typecheck; CI acceptance outstanding |
| Prove consumption | Locally validated | Minimal host passed 2/2 SSR and HTTP acceptance tests; frozen-lockfile CI verification outstanding |
| Reconcile documentation | In progress | Public entry points checked against source; final acceptance follows committed lockfiles and CI |
| Update ecosystem catalogue | Planned | Replace candidate `clock-service` with a one-line Foundation `clock` entry in a separate architecture-rules PR |
