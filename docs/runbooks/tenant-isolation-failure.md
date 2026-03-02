# Runbook: Tenant Isolation Failure

## Severity: P0 — CRITICAL
## Owner: Platform SRE + Data Governance

### Detection
- K8 data governance alert on cross-tenant query
- TenantContext middleware FP-011 violation
- K3 audit shows tenantId mismatch

### Immediate Actions
1. **HALT**: Stop affected module immediately
2. **VERIFY**: Check RLS policies on affected database
3. **AUDIT**: Query K3 for all cross-tenant access events
4. **ISOLATE**: Remove module from M30 gateway routing

### Investigation
1. Check TenantContextMiddleware is applied (shared/middleware)
2. Verify RLS triggers on affected database
3. Review module queries for missing WHERE tenantId clauses
4. Check entity definitions extend RasidBaseEntity

### Recovery
1. Fix RLS policy / query / middleware
2. Audit all data accessed during breach window
3. Notify affected tenants
4. Re-enable module after verification
