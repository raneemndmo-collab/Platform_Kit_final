# Runbook: v6.4 Module Failure Recovery

## Trigger
Any v6.4 enhanced module (APIL, Arabic AI, BI Cognitive, Data Intelligence, Data Safety, Infographic, Performance, Spreadsheet) becomes unresponsive.

## Steps

### 1. Identify Failed Module
```bash
kubectl get pods -n rasid -l rasid.io/version=6.4
kubectl describe pod <failed-pod> -n rasid
```

### 2. Check Database Connectivity
```bash
kubectl exec -n rasid <pod> -- pg_isready -h <module>-db -p 5432
```

### 3. Check Event Bus Connectivity
```bash
kubectl logs <pod> -n rasid | grep "EventEmitter"
```

### 4. Restart Module
```bash
kubectl rollout restart deployment/<module> -n rasid
```

### 5. Verify Recovery
```bash
kubectl exec -n rasid <pod> -- curl -s http://localhost:3000/health
```

### 6. Check Data Integrity
- Verify RLS policies are active
- Verify no cross-tenant data leakage
- Verify event bus is processing

## Escalation
If module does not recover within 5 minutes, escalate to Platform Engineering team.
