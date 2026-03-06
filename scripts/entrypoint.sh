#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL..."
until npx prisma migrate deploy 2>/dev/null; do
  echo "    PostgreSQL not ready, retrying in 2s..."
  sleep 2
done
echo "==> Migrations applied"

echo "==> Seeding database..."
npx prisma db seed 2>/dev/null || echo "    Seed skipped (already seeded or no seed script)"
echo "==> Seed complete"

echo "==> Starting Next.js server..."
exec node server.js
