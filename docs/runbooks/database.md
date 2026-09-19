# Database operations

The initial migration enables citext and creates all tables, relations and indexes. Prisma generates UUIDs and updatedAt; raw inserts must supply them.

| Action                       | Command                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Start/stop                   | `npm run db:up` / `npm run db:down`                                                        |
| Apply committed migrations   | `npm run db:deploy`                                                                        |
| Create development migration | `npm run db:migrate -- --name descriptive_name`                                            |
| Generate client              | `npm run db:generate`                                                                      |
| Seed                         | `npm run db:seed`                                                                          |
| Browse                       | `npm run db:studio`                                                                        |
| SQL                          | `docker compose exec postgres psql -U medimatrix -d medimatrix` (adjust names)             |
| Backup/restore               | `npm run db:backup` / `npm run db:restore -- backups/file.dump` (PowerShell or Unix shell) |

`db:reset` is destructive development-only and asks for confirmation. `docker compose down -v` destroys volumes and is deliberately not an npm convenience script.

Prisma does not model PostgreSQL CHECK constraints. Preserve the migration's cancellation-state/length, reason-length and file-size constraints in future schema changes. Clinical records use soft-delete columns and restrictive foreign keys; no hard-delete clinical API is exposed.

Use expand/contract migrations, keeping prior application versions compatible during rollback. Keep audit/outbox writes in domain transactions. Back up using pg_dump, never by copying a running volume. See the restore runbook.
