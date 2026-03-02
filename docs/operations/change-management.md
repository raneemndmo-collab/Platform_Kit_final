# Change Management (OPS-003)

| Type | Approval | Lead Time |
|------|----------|-----------|
| Standard (config, flag) | Module owner | 1 hour |
| Normal (endpoint, migration) | Owner + ARB | 24 hours |
| Major (new module, cross-module) | ARB + CTO | 1 week |
| Emergency (security, P0) | On-call + CTO | Immediate |

Deployment: Review → CI → Staging → Canary 5% → Rollout 10/25/50/100%
Rollback: Automated if error > 1% during canary (DCD-012)
