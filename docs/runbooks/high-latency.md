# Runbook: High Latency

## Symptom
K9 alert: module.latency.p95 > SLO threshold

## Diagnosis
1. Identify module from K9 alert
2. Check logs: duration_ms > 500
3. Check DB connections: pg_stat_activity
4. Check Tier 2 contention (Amendment E.2)

## Mitigation
1. Scale module horizontally
2. If DB contention: Apply DBP-005 through DBP-009
3. If query issue: Reduce timeout 3s to 2s
4. If cascade: Activate circuit breaker
5. If persistent: Trigger Tier 1 promotion

## Escalation
P1 if SLO breach > 5 minutes
