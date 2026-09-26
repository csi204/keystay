#!/usr/bin/env bash
set -e

echo "=========================================="
echo "   KEYSTAY Cloudflare R2 Setup Script     "
echo "=========================================="

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BUCKET_NAME=${R2_BUCKET_NAME:-keystay-assets}

echo "Provisioning R2 bucket: $BUCKET_NAME ..."
pnpm dlx wrangler r2 bucket create "$BUCKET_NAME" || true
echo "R2 Bucket provision step complete."
