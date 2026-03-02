# ADR-015: v6.4 Constitutional Compliance

## Status: Accepted
## Date: 2026-03-01

## Context
v6.4 adds 21 constitutional parts and 9 sections. All additions must be strictly additive.

## Decision
- All 8 new modules get isolated databases (P-003)
- All modules use EventEmitter2 (P-006)
- All modules registered in app.module.ts with constitutional build order
- All modules have CQRS commands/queries
- All modules have RLS-enabled tables
- No kernel modification (P-010)
- Deterministic execution preserved in all modes

## Consequences
- System maintains architectural integrity while expanding capabilities
- 62 total modules (10K + 31M + 13D + 8v64) all isolated
- Zero cross-module database access
