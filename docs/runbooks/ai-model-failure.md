# Runbook: AI Model Failure (M11)

## Severity: P2 — MEDIUM
## Owner: AI/ML Team

### Detection
- M11 fallback chain activation alerts
- Inference latency > 10s p95
- AI provider API errors

### Immediate Actions
1. Check M11 fallback chain status (L0 → L4)
2. Verify AI provider health
3. Check AI cost budget (Annex G limits)

### Fallback Chain (Constitutional)
- L0: Primary AI model
- L1: Secondary model (same provider)
- L2: Alternative provider
- L3: Cached/pre-computed results
- L4: Graceful degradation (business logic without AI)

### Recovery
1. Hot-swap to backup model if available
2. Clear inference request queue
3. Verify cost budget not exceeded
4. Monitor for cascade effects on dependent modules
