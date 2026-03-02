# Runbook: Event Bus Saturation (K5)

## Severity: P1 — HIGH
## Owner: Platform SRE

### Detection
- K9 metrics: event queue depth > threshold
- Event processing latency > 5s p99
- Dead letter queue growing

### Immediate Actions
1. Check K5 consumer group lag
2. Identify highest-volume event producers
3. Enable backpressure on K5 (rate limit publishers)

### Resolution
1. Scale K5 consumer pods horizontally
2. Review dead letter queue for poison messages
3. Check for event storms (module emitting excessive events)
4. Verify Kafka broker health and partition balance

### Prevention
- Set per-module event rate limits in K5
- Monitor event volume trends in K9
- Review event schemas for unnecessary payload size
