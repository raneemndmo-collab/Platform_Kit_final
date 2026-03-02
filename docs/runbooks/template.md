# Runbook Template (SRE-015)

## Symptom
_What alerts fire? What does the user experience?_

## Impact
_Which modules affected? Which tenants? Business impact level._

## Diagnosis
1. Check K9 dashboard
2. Check structured logs with trace_id
3. Check database connection pool status
4. Check event bus consumer lag

## Mitigation
_Step-by-step recovery actions._

## Escalation
| Severity | Response | Escalation |
|----------|----------|------------|
| P0 | 15 min | CTO + On-call |
| P1 | 30 min | Engineering Lead |
| P2 | 4 hours | Module Team |

## Post-Incident
- Root cause analysis within 48 hours
- Corrective actions tracked
- Runbook updated
