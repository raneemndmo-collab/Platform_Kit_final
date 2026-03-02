# API Lifecycle Guide (API-004 to API-008)

Versioning: /api/v{n}/module/resource (URL path, MAJOR only)
Max 2 versions active simultaneously.

Deprecation (API-007):
- Day 0: Announcement (Sunset header)
- Day 90: Migration support ends
- Day 120: Sunset (HTTP 410 Gone)

Design (API-001): RESTful, JSON, universal errors, HATEOAS, pagination
