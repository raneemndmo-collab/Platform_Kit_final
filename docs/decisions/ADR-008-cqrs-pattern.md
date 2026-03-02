# ADR-008-CQRS-PATTERN

## CQRS Command/Query Separation

**Status:** Accepted
**Date:** 2026-03-01
**Deciders:** Architecture Review Board

## Context
Need to separate read and write operations for scalability

## Decision
Use @nestjs/cqrs with BaseCommand/BaseQuery abstractions

## Consequences
More code per feature but clear separation of concerns.
