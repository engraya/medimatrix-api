# Documentation

- [Local verification results](verification.md)
- [API usage and contracts](api/README.md)
- [Architecture and decisions](adr/0001-implementation-decisions.md)
- [Implementation map for the 20-step plan](steps/README.md)
- [Local development](runbooks/local-development.md)
- [Database](runbooks/database.md)
- [Deployment](runbooks/deploy.md)
- [Rollback](runbooks/rollback.md)
- [Backup and restore](runbooks/backup-restore.md)
- [Secret rotation](runbooks/rotate-secrets.md)
- [Incident response](runbooks/incident.md)
- [Frontend integration](runbooks/frontend-integration.md)

The route registry generates Swagger at runtime and writes `docs/api/openapi.json` when you run `npm run docs:api`. The current generated artifact is included; local execution results are recorded in the verification report.
