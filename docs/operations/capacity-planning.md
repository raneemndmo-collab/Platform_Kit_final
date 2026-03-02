# Capacity Planning (OPS-005)

| Metric | Current | 6M | 12M | 24M |
|--------|---------|-----|------|------|
| Tenants | 10 | 50 | 200 | 1000 |
| Users | 500 | 2500 | 10K | 50K |
| API/sec | 100 | 500 | 2K | 10K |
| DB (TB) | 0.1 | 0.5 | 2.0 | 10.0 |

Scaling: CPU>70% → HPA, Mem>80% → increase, DB>80% → read replica
