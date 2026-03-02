# ADR-003: AI Layer Isolation

**Status:** ACCEPTED  
**Date:** 2026-01-15  
**Context:** AI capabilities evolve rapidly. Business modules must not be coupled to AI providers.  
**Decision:** AI modules (M11-M17) exist in isolated Intelligence Cluster. Zero access to business databases. Communication via capability interfaces only. AI provider replaceable within 4 hours.  
**Consequences:** Business operations continue without AI (L4 degradation). AI costs tracked and capped (Amendment E.3).  
**Rules:** P-004, HC-06, AI-001 through AI-010, APE-001 through APE-003
