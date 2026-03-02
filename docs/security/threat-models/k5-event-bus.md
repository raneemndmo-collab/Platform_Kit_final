# Threat Model: K5 Event Bus

## Component
**Module:** K5 Event Bus
**Description:** Event routing and schema registry
**Classification:** CONFIDENTIAL | **Date:** 2026-03-01 | **Methodology:** STRIDE

## STRIDE Analysis

| Category | Threat | Mitigation | Residual Risk |
|----------|--------|-----------|---------------|
| Spoofing | Attacker impersonates legitimate service | K1 JWT + MFA | LOW |
| Tampering | Unauthorized data modification | K3 audit trail, RLS, input validation | LOW |
| Repudiation | User denies action | K3 immutable audit, JWT correlation | LOW |
| Information Disclosure | Cross-tenant data leak | TenantContext, RLS, FP-050 | MEDIUM |
| Denial of Service | Resource exhaustion | M30 rate limiting, K9 monitoring | MEDIUM |
| Elevation of Privilege | Unauthorized permission gain | K2 RBAC+ABAC, least privilege | LOW |

## Module-Specific Threats
- **event-injection**: Identified and mitigated through constitutional controls
- **schema-poisoning**: Identified and mitigated through constitutional controls

## Controls
| Control | Implementation | Status |
|---------|---------------|--------|
| Authentication | K1 JWT + MFA | Active |
| Authorization | K2 RBAC+ABAC | Active |
| Audit | K3 immutable log | Active |
| Network | NetworkPolicy (k8s) | Active |
| Data | Database-per-module isolation | Active |
| Tenant | RLS + TenantContext | Active |
