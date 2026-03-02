# ADR-001: Modular Monolith Architecture

**Status:** ACCEPTED  
**Date:** 2026-01-15  
**Context:** Rasid Platform requires enterprise-grade scalability with development team agility.  
**Decision:** Build as Modular Monolith (Stage 0-1 topology). Each module is a bounded context with own database, event namespace, and API surface. Extraction to microservices follows quantitative triggers (Amendment E.1).  
**Consequences:** Simpler deployment, lower operational overhead, clear module boundaries. Extraction path defined with 8 quantitative triggers.  
**Rules:** HC-02, HC-03, P-003, P-012, EXT-001 through EXT-007
