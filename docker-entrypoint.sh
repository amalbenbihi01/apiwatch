#!/bin/sh
set -e

# Run Prisma migrations in production mode
echo "==> [APIWatch Entrypoint] Running database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "==> [APIWatch Entrypoint] Database is up to date. Starting application..."
exec "$@"
