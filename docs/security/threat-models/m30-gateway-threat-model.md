# STRIDE Threat Model: m30-gateway
## Version: 6.4.0 | Date: 2026-03-01

### Assets
- Module database (isolated, RLS-enabled)
- Service endpoints & API controllers
- Event payloads
- Tenant-scoped data

### Threats

| ID | Category | Threat | Mitigation | Severity |
|----|----------|--------|------------|----------|
| T1 | Spoofing | Unauthorized tenant access | JWT + K1 auth + tenant context middleware | HIGH |
| T2 | Tampering | Data manipulation | K3 audit trail + append-only events | MEDIUM |
| T3 | Repudiation | Action denial | K3 audit logging for all mutations | LOW |
| T4 | Info Disclosure | Cross-tenant data leak | RLS + DB isolation + network policies | CRITICAL |
| T5 | DoS | Resource exhaustion | Rate limiting + resource quotas + K9 monitoring | HIGH |
| T6 | Privilege Escalation | Role bypass | K2 RBAC + policy enforcement + ABAC | HIGH |

### Controls Applied
- [x] Database isolation (P-003, HC-04)
- [x] Row-Level Security (TNT-001)
- [x] Network policy isolation
- [x] K1/K2 auth integration
- [x] K3 audit logging
- [x] K9 monitoring & alerting
