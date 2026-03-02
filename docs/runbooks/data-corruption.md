# Runbook: Data Corruption Recovery

## Severity: P0 — CRITICAL
## Owner: Database Team + Module Owner

### Detection
- Application errors on data read
- K8 data governance integrity check failure
- User reports of incorrect data

### Immediate Actions
1. **STOP WRITES**: Put affected module in read-only mode
2. **IDENTIFY**: Determine corruption scope (which tables/rows)
3. **SNAPSHOT**: Take immediate database backup

### Recovery
1. Identify last known good state from K3 audit trail
2. Apply forward-only compensation migration (FRZ-004)
3. Replay events from K5 to reconstruct state if applicable
4. Verify data integrity with K8 validation

### FORBIDDEN
- Rollback migrations in production (FRZ-004)
- Direct database manipulation without audit trail
