# Local verification

Verified on Windows with Node.js 24.20.0, npm 11.19.0 and Docker Desktop. This records local results, not a production release certification.

| Check | Result |
| --- | --- |
| Dependency installation | Complete; package-lock.json generated |
| Dependency audit | Zero reported vulnerabilities after targeted upgrades/overrides |
| Prisma client generation and schema validation | Passed |
| Initial migration | Applied to the project database |
| Seed | Nine doctors; local development administrator configured |
| Typecheck and lint | Passed |
| Production TypeScript build | Passed |
| Unit tests | 16 passed across 4 files |
| Database integration / HTTP journey tests | 14 passed across 6 files using isolated PostgreSQL containers |
| Configuration integrity | Passed |
| OpenAPI generation | Generated docs/api/openapi.json |
| API readiness and doctors endpoint | HTTP 200; database ready; nine doctors returned |
| Administrator login, dashboard, logout | Passed using cookie authentication |
| Load smoke | 100 local liveness requests, five connections; no reported errors; 4.01 ms mean latency |
| Database backup | Custom-format dump created under ignored backups/ |

## Local services

- API: http://localhost:4000
- Swagger: http://localhost:4000/api/v1/docs
- Mailpit: http://localhost:8025
- MinIO console: http://localhost:9001
- PostgreSQL host port: 55432 (the host's port 5432 was already occupied)

The seeded administrator credentials are in the ignored `.env` file under SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD. Keep that file private. Start/restart the API with `npm start` after building, or `npm run dev` while editing. Start dependencies with `docker compose up -d postgres minio createbuckets mailpit`.

The install/verification pass fixed strict TypeScript issues, updated audited dependencies, aligned Docker/CI with Node 24, switched MinIO pulls to Quay, and replaced shell-dependent npm backup/restore commands with binary-safe Node streams.

## Limits

The test journey uses test email/SMS providers and local test document storage. Paid external provider delivery, production deployment, the external frontend cutover, a database restore drill and production load capacity were not verified. Destructive reset/restore commands, database shutdown and external publishing were not run as part of ordinary setup. The backup file was created; a successful restore is a separate check.
