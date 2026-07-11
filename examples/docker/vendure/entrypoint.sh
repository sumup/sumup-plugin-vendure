#!/bin/sh
set -e

if [ ! -f /shared/.seeded ]; then
  echo "[entrypoint] Seeding demo data..."
  npm run seed
  touch /shared/.seeded
else
  echo "[entrypoint] Demo data already seeded."
fi

echo "[entrypoint] Syncing demo data..."
npm run sync-demo

echo "[entrypoint] Starting Vendure..."
exec npm run start
