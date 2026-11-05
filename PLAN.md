# Plan

> **In short:** approve the clock interface, then implement and verify it against a minimal consuming Nuxt application.

| Stage | Status | Acceptance |
|---|---|---|
| Define boundaries and draft consumer contract | Completed in PR #1 | Review classification, types, settings and public entry points |
| Specify temporal semantics | Completed in PR #2 | Precision, arithmetic, DST, export names and error policy documented; awaiting review |
| Implement pure core | In progress | Initial Temporal-based implementation and tests committed; CI/typecheck and contract acceptance outstanding |
| Integrate Nuxt and Nitro | Implementation in review | Layer entry, composable and Nitro helper added; local and CI validation outstanding |
| Prove consumption | Implementation in review | Minimal host, SSR and HTTP acceptance tests added; tests not run |
| Reconcile documentation | In progress | `CONTRACT.md` describes implemented API exactly |
| Update ecosystem catalogue | Planned | Replace candidate `clock-service` with a one-line Foundation `clock` entry in a separate architecture-rules PR |
