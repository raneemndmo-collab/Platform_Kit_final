# Runbook: Security Breach Response

## Severity: P0 — CRITICAL
## Owner: Security Team + Platform SRE

### Detection
- K9 monitoring alerts on anomalous patterns
- K3 audit log shows unauthorized access patterns
- WAF / IDS alerts

### Immediate Actions (0-15 minutes)
1. **Isolate**: Block compromised tenant/user via K2 emergency policy
2. **Preserve**: Snapshot K3 audit logs for forensics
3. **Notify**: Alert incident commander + security team
4. **Assess**: Determine blast radius (which tenants/modules affected)

### Containment (15-60 minutes)
1. Rotate all affected credentials (K1 token invalidation)
2. Enable enhanced logging on affected modules
3. Review K5 event bus for unauthorized events
4. Check for lateral movement across tenant boundaries

### Recovery
1. Patch vulnerability if identified
2. Re-enable services after verification
3. Notify affected tenants per SLA
4. Post-incident review within 48 hours

### Post-Incident
- Update threat models (Part 30)
- Add detection rules to K9
- Compliance notification (PDPL Article 19 if applicable)
