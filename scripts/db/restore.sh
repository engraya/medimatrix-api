#!/bin/sh
set -eu
restore_file="${1:?Usage: sh scripts/db/restore.sh path/to/backup.dump}"
test -f "$restore_file"
printf 'This replaces data in the compose database. Type RESTORE to continue: '
read -r answer
test "$answer" = RESTORE || exit 1
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --exit-on-error --single-transaction' < "$restore_file"
