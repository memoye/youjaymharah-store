#!/bin/sh
set -e

# Schema and code ship together, and one instance means no second container can
# be mid-migration. Set RUN_MIGRATIONS=false once more than one runs.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  medusa db:migrate
fi

exec "$@"
