# FinOps & Infrastructure Cost Governance

## Constitutional Reference: Annex G

## Cost Allocation Model
| Resource | Cost Center | Allocation Method |
|----------|------------|-------------------|
| Kernel (K1-K10) | Platform | Fixed infrastructure |
| Business Modules (M1-M31) | Per-tenant | Usage-based metering |
| AI Inference (M11) | AI Budget | Per-request costing |
| DPC Cluster (D1-D13) | Document Processing | Per-conversion job |
| Storage | Per-module | Actual usage |

## Cost Optimization Rules
1. AI model selection MUST consider cost-per-token (M11 budget)
2. DPC GPU nodes auto-scale to zero when idle
3. Analytics pipelines (M12) scheduled for off-peak hours
4. Tenant resource limits enforced by M28

## Budget Alerts
- Module exceeds 80% monthly budget → WARNING
- Module exceeds 100% → THROTTLE (reduce to P3 priority)
- AI cost exceeds daily limit → Fallback to L3 (cached results)
