# Runbook: Database Failover

## Symptom
K9 alert: database.health.critical

## Impact
- Tier 1 failure: 1 module, < 60s recovery
- Tier 2 failure: up to 9 modules, < 120s recovery

## Mitigation
1. Tier 1: Auto replica promotion (verify 60s)
2. Tier 2: Standby promotion (verify 120s)
3. Manual: pg_ctl promote on standby
4. Post: Verify all module health endpoints

## Escalation
P0 for Tier 1 (Finance, Billing) failures
