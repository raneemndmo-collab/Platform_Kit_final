# Runbook: APIL Quality Degradation

## Trigger
APIL orchestrator reports quality scores consistently below 0.9 threshold.

## Steps

### 1. Check Current Quality Metrics
```bash
kubectl logs -n rasid deployment/apil-orchestrator | grep "quality"
```

### 2. Identify Failing Agents
Check which AI agents are returning low-quality results.

### 3. Check Resource Availability
```bash
kubectl top pods -n rasid -l app=apil-orchestrator
kubectl describe resourcequota -n rasid
```

### 4. GPU Check (if applicable)
```bash
kubectl get nodes -l gpu=true
nvidia-smi
```

### 5. Force STRICT Mode
If quality continues to degrade, force STRICT mode for all executions.

### 6. Restart Agent Pipeline
```bash
kubectl rollout restart deployment/apil-orchestrator -n rasid
```

## Root Cause Analysis
- Check model versions
- Check data quality scores
- Check resource contention
