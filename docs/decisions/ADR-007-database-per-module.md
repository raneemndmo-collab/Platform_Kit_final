# ADR-007-DATABASE-PER-MODULE

## Database Per Module Isolation

**Status:** Accepted
**Date:** 2026-03-01
**Deciders:** Architecture Review Board

## Context
Each module needs data sovereignty per P-003

## Decision
Each module gets its own PostgreSQL database with dedicated credentials

## Consequences
54 databases total. Higher ops complexity but complete isolation.
