# Health

Liveness confirms HTTP is running. Readiness queries PostgreSQL and exposes the last worker heartbeat; database failure gives 503. Routes are available at root and /api/v1. Readiness does not validate third-party credentials; monitor provider delivery and heartbeat age separately.
