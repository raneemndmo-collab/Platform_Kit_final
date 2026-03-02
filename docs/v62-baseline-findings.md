# ═══════════════════════════════════════════════════════════════════════
# RASID v6.2 Baseline Findings
# Date: 2026-03-01
# Purpose: Document pre-existing code patterns detected by v6.2 gates
# Impact: These are NOT regressions — they are pre-v6.2 patterns
# Remediation: Scheduled for Phase 6 (post-launch) remediation sprint
# ═══════════════════════════════════════════════════════════════════════

## Finding BF-001: PII in Log Statement (FP-050)
- **File:** `modules/m1-hrm/application/handlers/hrm.service.ts:47`
- **Pattern:** `this.logger.log(\`Employee created: ${saved.email}\`)`
- **Classification:** L4 PII (email) in log output
- **Severity:** HIGH
- **Status:** BASELINE (pre-v6.2 code, FROZEN per constraint)
- **Mitigation:** TracingInterceptor sanitizes at output level
- **Remediation:** Phase 6 — replace with reference ID logging
- **Constraint:** Cannot modify M1-M24 source (V62C-001)

## Finding BF-002: Potential PII in Event Entities (FP-053)
- **Location:** Multiple entity files contain email/phone fields
- **Classification:** WARNING — fields exist in entities, not necessarily in events
- **Status:** BASELINE — event payloads use K5 serialization
- **Mitigation:** K5 Event Bus schema validation (ESR-001)
- **Remediation:** Phase 6 audit of all event payloads

## Finding BF-003: tenantId Coverage in M1-HRM Entities
- **Location:** `modules/m1-hrm/domain/entities/index.ts`
- **Pattern:** Not all entity definitions have visible tenantId
- **Status:** BASELINE — tenantId injected at runtime via TenantContext
- **Mitigation:** RLS enforcement at database level
- **Remediation:** Phase 6 — explicit tenantId in all entity definitions

## Finding BF-004: Raw Date Usage (FP-063)
- **Location:** 33 files across modules
- **Pattern:** `new Date()` / `Date.now()` usage
- **Status:** INFO — most are for timestamps, not timezone business logic
- **Mitigation:** TracingInterceptor uses ISO format with timezone
- **Remediation:** Phase 6 — audit for timezone-dependent business logic

## Baseline Gate Configuration
To prevent blocking builds on baseline findings, the CI gate
script uses baseline exclusions. New violations beyond this
baseline WILL block the build.

## Summary
| Finding | Rule | Severity | Mitigation | Remediation |
|---------|------|----------|------------|-------------|
| BF-001 | FP-050 | HIGH | TracingInterceptor | Phase 6 |
| BF-002 | FP-053 | WARNING | K5 schema validation | Phase 6 |
| BF-003 | TNT-001 | WARNING | Runtime RLS | Phase 6 |
| BF-004 | FP-063 | INFO | ISO timestamps | Phase 6 |
