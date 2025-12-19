#!/bin/sh
set -eu

PGADMIN_SERVER_NAME="${PGADMIN_SERVER_NAME:-Postgres}"
PGADMIN_SERVER_GROUP="${PGADMIN_SERVER_GROUP:-Servers}"
PGADMIN_SERVER_HOST="${PGADMIN_SERVER_HOST:-db}"
PGADMIN_SERVER_PORT="${PGADMIN_SERVER_PORT:-5432}"

DB_USER="${POSTGRES_USER:-${DB_USER:-postgres}}"
DB_PASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD:-postgres}}"
DB_NAME="${POSTGRES_DB:-${DB_NAME:-app}}"

TEMPLATE_PATH="/pgadmin4/servers.template.json"
PGADMIN_SERVER_JSON_FILE="${PGADMIN_SERVER_JSON_FILE:-/var/lib/pgadmin/servers.json}"
export PGADMIN_SERVER_JSON_FILE
TARGET_PATH="$PGADMIN_SERVER_JSON_FILE"
PGPASS_FILE="${PGPASS_FILE:-/var/lib/pgadmin/pgpass}"
export PGPASS_FILE

escape_sed() {
  printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

if [ -f "$TEMPLATE_PATH" ]; then
  ESC_SERVER_NAME="$(escape_sed "$PGADMIN_SERVER_NAME")"
  ESC_SERVER_GROUP="$(escape_sed "$PGADMIN_SERVER_GROUP")"
  ESC_SERVER_HOST="$(escape_sed "$PGADMIN_SERVER_HOST")"
  ESC_DB_NAME="$(escape_sed "$DB_NAME")"
  ESC_DB_USER="$(escape_sed "$DB_USER")"

  sed \
    -e "s|__SERVER_NAME__|${ESC_SERVER_NAME}|g" \
    -e "s|__SERVER_GROUP__|${ESC_SERVER_GROUP}|g" \
    -e "s|__SERVER_HOST__|${ESC_SERVER_HOST}|g" \
    -e "s|__SERVER_PORT__|${PGADMIN_SERVER_PORT}|g" \
    -e "s|__MAINTENANCE_DB__|${ESC_DB_NAME}|g" \
    -e "s|__DB_USER__|${ESC_DB_USER}|g" \
    "$TEMPLATE_PATH" > "$TARGET_PATH"
else
  cat > "$TARGET_PATH" <<EOF_JSON
{
  "Servers": {
    "1": {
      "Name": "${PGADMIN_SERVER_NAME}",
      "Group": "${PGADMIN_SERVER_GROUP}",
      "Host": "${PGADMIN_SERVER_HOST}",
      "Port": ${PGADMIN_SERVER_PORT},
      "MaintenanceDB": "${DB_NAME}",
      "Username": "${DB_USER}",
      "SSLMode": "prefer",
      "PassFile": "/pgpass"
    }
  }
}
EOF_JSON
fi

cat > "$PGPASS_FILE" <<EOF_PASS
${PGADMIN_SERVER_HOST}:${PGADMIN_SERVER_PORT}:${DB_NAME}:${DB_USER}:${DB_PASSWORD}
EOF_PASS
chmod 600 "$PGPASS_FILE"

exec /entrypoint.sh "$@"
