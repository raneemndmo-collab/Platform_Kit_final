# ADR-005: Zero Trust Security Architecture (v6.2)

**Status:** ACCEPTED  
**Date:** 2026-03-01  
**Context:** v6.2 governance requires defense-in-depth security model.  
**Decision:** Adopt Zero Trust: mTLS for all inter-service communication, RBAC+ABAC authorization, NetworkPolicy microsegmentation, automated secret rotation, threat modeling per module.  
**Consequences:** Higher security posture. All communication authenticated and authorized regardless of network position.  
**Rules:** ZTS-001 through ZTS-024, FP-055 through FP-059
