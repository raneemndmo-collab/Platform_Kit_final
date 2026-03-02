# ADR-009-FEATURE-FLAGS

## Feature Flag Progressive Delivery

**Status:** Accepted
**Date:** 2026-03-01
**Deciders:** Architecture Review Board

## Context
Need to control feature rollout across tenants

## Decision
Hash-based deterministic rollout with tenant-scoped flags

## Consequences
Flag hygiene required — all flags must have expiry dates.
