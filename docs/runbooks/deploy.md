# Deployment

No host has been provisioned. Run verification and resolve failures first. Install and commit package-lock.json; Docker and CI require npm ci.

1. Run CI. Configure GitHub's staging environment and dispatch the image publishing workflow. It publishes GHCR tags `<sha>` and `migrate-<sha>`. Configure target-host registry credentials.
2. Install Docker Compose, set DNS, permit HTTPS/HTTP for Caddy, provision persistent disk and encrypted private S3 storage, and configure provider credentials/monitoring.
3. Put runtime configuration outside the repo, e.g. `/etc/medimatrix/runtime.env`. Use NODE_ENV=production, HTTPS URLs, allowed frontend origins, independent secrets, production providers, COOKIE_SECURE=true and PORT=4000. Frontend and API should use same-site HTTPS domains.
4. Put Compose variables in `/etc/medimatrix/compose.env`: RUNTIME_ENV_FILE, API_IMAGE, MIGRATE_IMAGE, API_DOMAIN, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB and BACKUP_S3_URI. Database values must match runtime config. Use immutable image tags. Runtime config must also provide standard AWS backup credentials/region and optional AWS_ENDPOINT_URL.
5. Run from the release directory:

```sh
docker compose --env-file /etc/medimatrix/compose.env -f docker-compose.prod.yml up -d postgres
docker compose --env-file /etc/medimatrix/compose.env -f docker-compose.prod.yml --profile tools pull migrate api
docker compose --env-file /etc/medimatrix/compose.env -f docker-compose.prod.yml run --rm migrate
docker compose --env-file /etc/medimatrix/compose.env -f docker-compose.prod.yml up -d api caddy backup
```

6. Seed doctors using `docker compose ... exec api node dist/prisma/seed.js`. Create the first admin with `docker compose ... exec -e ADMIN_PASSWORD api node dist/scripts/create-admin.js`, securely setting ADMIN_PASSWORD in the operator session first. Replace `...` with the same Compose flags above. Production seed never creates a development admin.
7. Verify HTTPS readiness, synthetic patient OTP/registration/booking and staff scheduling/cancellation. Check actual provider delivery and unauthorized access. Complete a restore drill before production traffic.

The workflow publishes images only; no host/SSH policy was supplied. Configure approval-gated host rollout after successful staging. Fake providers and local storage are rejected in production. Monitor heartbeat separately from database readiness.

Backup uploads at startup and every 24 hours. Configure 30-day lifecycle expiration on a dedicated private prefix and alerts for missing/failed uploads.
