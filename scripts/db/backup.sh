#!/bin/sh
set -eu
umask 077
mkdir -p backups
backup_file="backups/medimatrix-$(date -u +%Y%m%dT%H%M%SZ).dump"
if docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_file"; then
  printf 'Backup: %s\n' "$backup_file"
else
  rm -f "$backup_file"
  exit 1
fi
