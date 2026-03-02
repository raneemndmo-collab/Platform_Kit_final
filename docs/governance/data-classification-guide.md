# Data Classification Guide (v6.2)

Classification: L5>L4>L3>L2>L1
- L5: Credentials, secrets, government-classified
- L4: PII, financial, health, legal
- L3: Business-sensitive, competitive
- L2: Operational, non-public
- L1: Public

Process: Determine PII → Apply level → Register in K8 → Define retention → Tag consent basis
Rules: DGP-003 (unclassified=FORBIDDEN), DGP-004 (downgrade=ARB+DPO)
