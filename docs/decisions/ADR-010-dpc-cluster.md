# ADR-010-DPC-CLUSTER

## Document Processing Cluster Isolation

**Status:** Accepted
**Date:** 2026-03-01
**Deciders:** Architecture Review Board

## Context
Tier X document processing must not affect OLTP performance

## Decision
Dedicated Kubernetes node pool with GPU support, physical isolation

## Consequences
Higher infrastructure cost but guaranteed SLA isolation.
