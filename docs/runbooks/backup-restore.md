# Backup and restore

Local npm scripts create custom-format pg_dump backups through Node streams, preserving binary output on Windows and Unix. The optional `.sh` helpers remain available for Unix shells. Restrict dump access: backups contain patient and authentication data.

Production sidecar uploads to BACKUP_S3_URI using dedicated AWS credentials. Configure encryption and 30-day lifecycle expiration, plus alerts on latest successful backup age. Container health is not proof of backup success.

Restore drill:

1. Download a recent dump to a restricted directory.
2. Start an isolated PostgreSQL 16 container/database with separate ports and volumes.
3. Restore with `pg_restore --exit-on-error --single-transaction --clean --if-exists`.
4. Verify counts, relations, recent appointments/audit rows and migration state. Use test providers and no production outbound notifications in the restored application.
5. Record recovery duration, backup age/data-loss window and results; dispose of sensitive drill data according to policy.

Both restore commands require typing RESTORE before replacing development data. Production restore remains an explicit operator procedure. PostgreSQL backups exclude S3 documents: independently version/back up those objects and test document retrieval during recovery.
