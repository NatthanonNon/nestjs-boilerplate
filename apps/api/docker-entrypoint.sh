#!/bin/sh
set -eu

run_migrations() {
  if [ "${RUN_MIGRATIONS_ON_STARTUP:-true}" != "true" ]; then
    return
  fi

  max_attempts="${MIGRATION_MAX_ATTEMPTS:-10}"
  delay_seconds="${MIGRATION_RETRY_DELAY_SECONDS:-3}"
  attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    if ./node_modules/.bin/knex migrate:latest --knexfile knexfile.js; then
      return
    fi

    echo "Migration attempt ${attempt}/${max_attempts} failed. Retrying in ${delay_seconds}s..." >&2
    attempt=$((attempt + 1))
    sleep "$delay_seconds"
  done

  echo "Migrations failed after ${max_attempts} attempts." >&2
  exit 1
}

run_migrations
exec "$@"
