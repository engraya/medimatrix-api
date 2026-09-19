#!/bin/sh
set -eu
umask 077
: "${BACKUP_S3_URI:?Set a private backup bucket/prefix}"
while true; do
  backup_file="/tmp/medimatrix-$(date -u +%Y%m%dT%H%M%SZ).dump"
  if pg_dump --format=custom --file="$backup_file"; then
    if aws s3 cp "$backup_file" "$BACKUP_S3_URI/$(basename "$backup_file")" --only-show-errors; then
      printf 'Backup uploaded successfully\n'
    else
      printf 'Backup upload failed\n' >&2
      exit 1
    fi
    rm -f "$backup_file"
  else
    printf 'Database backup failed\n' >&2
    exit 1
  fi
  sleep 86400
done
