# ADR-004: Row-Level Security Tenant Isolation

**Status:** ACCEPTED  
**Date:** 2026-01-15  
**Context:** Multi-tenant SaaS requires strict data isolation without infrastructure complexity.  
**Decision:** Row-Level Security with tenantId column in every entity. TenantContext middleware injects tenant scope. No physical tenant isolation (HC-04). Canary tests verify isolation on every deployment.  
**Consequences:** Efficient resource utilization, simpler operations. Strict runtime enforcement prevents data leakage.  
**Rules:** HC-04, P-016, TNT-001 through TNT-007, TIC-001 through TIC-003
