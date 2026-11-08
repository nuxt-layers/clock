# Plan

> **In short:** add the interchange formats used by authentication, authorisation and other protocols, extend the pattern grammar for common human formats, then settle runtime compatibility and time-zone data.

| Stage | Status | Acceptance |
|---|---|---|
| Specify interchange formats and pattern additions | Done | Formats, standards, read and write rules, ranges and error codes accepted in `CONTRACT.md` |
| Implement interchange formats | In review | `parseInterchange` and `formatInterchange` for all eight formats, with tests from each standard's examples, edge ranges, truncation and rejection |
| Implement pattern additions | Next | Unpadded fields, English month and weekday names, 12-hour clock with `am`/`pm`; weekday agreement and contradiction tests |
| Runtime compatibility | Planned | Agreed list of supported runtimes tested in CI; a recorded approach for moving from `@js-temporal/polyfill` to native Temporal |
| Time-zone data and precision | Planned | Contract tests that fail when a runtime's zone data or precision differs from the documented assumptions |
