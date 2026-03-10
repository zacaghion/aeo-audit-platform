#!/bin/sh
set -e

echo "==> Waiting for PostgreSQL..."
until node node_modules/prisma/build/index.js migrate deploy; do
  echo "    Migration failed or DB not ready, retrying in 3s..."
  sleep 3
done
echo "==> Migrations applied"

echo "==> Backfilling slugs..."
node scripts/backfill-slugs.js || echo "    Slug backfill skipped"

echo "==> Seeding database..."
node prisma/seed.js || echo "    Seed skipped or already seeded"
echo "==> Seed complete"

echo "==> Starting Next.js server..."
exec node server.js
