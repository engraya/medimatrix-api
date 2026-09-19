#!/bin/sh
set -eu
attempt=0
until docker compose exec -T postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'; do
  attempt=$((attempt + 1))
  test "$attempt" -lt 30 || exit 1
  sleep 2
done
