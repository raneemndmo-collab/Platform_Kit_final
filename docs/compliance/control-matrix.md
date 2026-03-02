# Regulatory Control Matrix (RCF-008)

## PDPL (Saudi)
| Article | Requirement | Control | Module |
|---------|-------------|---------|--------|
| Art. 5 | Lawful basis | Consent Registry DGP-024 | K8, M28 |
| Art. 10 | Minimization | DGP-006 | K8 |
| Art. 14 | Subject rights | Erasure Handler DGP-011 | All |
| Art. 22 | Erasure | Cross-module saga DGP-012 | K7 |

## SOC 2
| Control | Requirement | Evidence |
|---------|-------------|----------|
| CC6.1 | Access control | K1+K2+MFA |
| CC6.3 | Logical access | NetworkPolicy ZTS-019 |
| CC7.2 | Monitoring | K9+SLO definitions |
| CC8.1 | Change mgmt | CI gates+OPS-003 |
