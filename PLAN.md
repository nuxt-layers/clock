# Plan

> **In short:** approve the clock interface, then implement and verify it against a minimal consuming Nuxt application.

| Stage | Status | Acceptance |
|---|---|---|
| Define boundaries and draft consumer contract | Draft | Review classification, types, settings and public entry points |
| Specify temporal semantics | Drafted | Precision, arithmetic, DST, export names and error policy documented; awaiting review |
| Implement pure core | Planned | Parsing, validation, time zones, formatting and arithmetic tests |
| Integrate Nuxt and Nitro | Planned | Config, request-safe clock provider and hydration tests |
| Prove consumption | Planned | Minimal host within 50-line budget, contract-only integration tests |
| Reconcile documentation | Planned | `CONTRACT.md` describes implemented API exactly |
| Update ecosystem catalogue | Planned | Replace candidate `clock-service` with a one-line Foundation `clock` entry in a separate architecture-rules PR |
