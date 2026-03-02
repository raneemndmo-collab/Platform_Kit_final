# Threat Model: M2 Finance
## STRIDE Analysis (ZTS-016)

**Module:** M2 Finance
**Classification:** HIGH
**Assets:** Financial data (L4-L5), invoices, payments, bank accounts
**Review Date:** 2026-03-01
**Next Review:** 2026-06-01 (quarterly)

### Trust Boundaries
- External → API Gateway (M30) → M2 Finance
- M2 Finance → Own Database (Tier 1 isolated)
- M2 Finance → K5 Event Bus (published events)

### Threats

| Category | Threat | Likelihood | Impact | Mitigation | Rule |
|----------|--------|------------|--------|------------|------|
| **Spoofing** | Forged authentication tokens | MEDIUM | CRITICAL | K1 token validation, JWT verification | ZTS-003 |
| **Tampering** | Modified request payload | MEDIUM | HIGH | Input validation, schema enforcement (K8) | DGP-003 |
| **Repudiation** | Denied actions | LOW | HIGH | Immutable audit log (K3), actor tracking | P-017 |
| **Info Disclosure** | PII leakage in logs | MEDIUM | CRITICAL | PII sanitization interceptor (FP-050) | DGP-008 |
| **Info Disclosure** | Cross-tenant access | LOW | CRITICAL | RLS enforcement, canary tests | TNT-001 |
| **DoS** | Request flood | HIGH | MEDIUM | Rate limiting (M30), circuit breaker | BP-L2 |
| **Elevation** | Unauthorized admin | LOW | CRITICAL | RBAC+ABAC (K2), MFA escalation | ZTS-012 |

### Residual Risk: LOW (all mitigations in place)
