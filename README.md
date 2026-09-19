# MediMatrix API

TypeScript/Express backend for patient registration and appointments, with PostgreSQL 16 in Docker, Prisma, patient email OTP, staff password authentication, private document storage, and transactional notifications.

Dependencies are installed and the lockfile is included. Local migrations, seed, typecheck, lint, build, unit/integration tests, API startup and backup have been exercised. See [verification results](docs/verification.md). Production deployment and a restore drill remain operator tasks. Use `npm ci` for subsequent reproducible installations.

The configured local API is `http://localhost:4000`, with PostgreSQL on host port `55432` to avoid an existing database. The local administrator email/password are in the ignored `.env` file under `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## Prerequisites

- Node.js 24 LTS and npm; Docker Desktop with Linux containers.
- The npm database utilities work directly in PowerShell, including binary-safe backup/restore. The optional `.sh` helpers are for Unix shells.
- Production email, SMS and private S3 credentials when deploying. Development uses Mailpit, fake SMS and MinIO.

## First run (PowerShell)

```powershell
Copy-Item .env.example .env
# Edit .env: independently generate JWT_SECRET and OTP_PEPPER (at least 32 random characters).
# Optional: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).
npm install
npm run db:generate
docker compose up -d postgres minio createbuckets mailpit
npm run db:deploy
npm run db:seed
npm run dev
```

The API listens on `http://localhost:4000`. Swagger: `http://localhost:4000/api/v1/docs`. Liveness: `/health/live`; database readiness: `/health/ready`. Mailpit: `http://localhost:8025`; MinIO console: `http://localhost:9001`.

To generate a random secret yourself:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Run that separately for each secret. Keep `.env` private. Leave `COOKIE_DOMAIN` empty on localhost. Doctor seed image paths refer to the existing frontend's assets; replace them with your hosted image URLs if needed.

## Run everything in Docker

After your first `npm install` has produced `package-lock.json` and `.env` is configured:

```powershell
docker compose --profile app up --build -d
npm run db:seed
```

The one-shot migration container runs before the API. Default `docker compose up -d` starts infrastructure only, which lets you develop using `npm run dev` on the host. Hostname overrides inside Compose distinguish internal services from host ports. `S3_PUBLIC_ENDPOINT` must be reachable from your browser, unlike the internal `S3_ENDPOINT`.

## Verify when ready

```powershell
npm run db:generate
npm run db:validate
npm run check:config
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:coverage
npm run build
npm run docs:api
```

Integration tests start an isolated PostgreSQL Testcontainer, migrate it, reset its tables between tests and remove it afterward. CI uses a separate PostgreSQL service named `medimatrix_test`. Tests never intentionally connect to the development database. `test:e2e` runs the complete HTTP patient/staff journey against the isolated database and test providers. The coverage command includes both unit and integration tests; see the verification report for measured results. The plan's 80% release gate is not automatically enforced.

## Main features

- Public doctor lookup; admin doctor creation, editing and deactivation.
- Patient email OTP, optional phone verification for SMS, staff login, rotating refresh tokens, replay detection, logout and reset/invitation completion.
- Patient registration with all three consents, validated references, scoped reads and audited staff access.
- Pending bookings, staff scheduling/rescheduling, cancellation rules and dashboard totals.
- PDF/JPEG/PNG uploads up to 5 MiB, detected from file bytes, with private five-minute download URLs.
- Database outbox, concurrent-worker row claiming, retries, lease recovery, inbox and channel preferences.
- SMTP/Resend email, fake/Twilio SMS, MinIO/S3 or local development storage.
- Docker/CI files, production Compose, backup utilities, runbooks and a browser client example.

## Repository map

| Path                                         | Responsibility                                            |
| -------------------------------------------- | --------------------------------------------------------- |
| `src/app.ts`, `src/server.ts`                | Testable Express app and process lifecycle                |
| `src/modules/`                               | Domain routes, schemas, services and query helpers        |
| `src/utils/endpoint.ts`                      | Shared validation/controller/envelope/OpenAPI wiring      |
| `src/config/`, `src/middleware/`, `src/lib/` | Configuration, security and provider adapters             |
| `prisma/`                                    | Full schema, initial migration and idempotent doctor seed |
| `tests/`                                     | Unit, database integration and HTTP journey tests         |
| `examples/frontend/`                         | Copyable Next.js browser client                           |
| `docker/`, `scripts/`, `.github/`            | Infrastructure, operator utilities and CI                 |
| `docs/`                                      | Architecture, API guide, implementation map and runbooks  |

See [documentation](docs/README.md), [design decisions](docs/adr/0001-implementation-decisions.md), and [implementation status](docs/steps/README.md) for details and explicit differences from the supplied plan.
