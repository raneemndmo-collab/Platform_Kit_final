# ADR-002: CQRS + Event-Driven Architecture

**Status:** ACCEPTED  
**Date:** 2026-01-15  
**Context:** Cross-module communication requires loose coupling and auditability.  
**Decision:** CQRS (read/write separation) mandatory per module. Cross-module communication via domain events through K5 Event Bus. Synchronous calls limited to 3 hops (DEP-004).  
**Consequences:** Event-driven enables audit trail, replay, analytics projections. CQRS enables independent read/write scaling.  
**Rules:** P-006, P-017, ESR-001 through ESR-004
