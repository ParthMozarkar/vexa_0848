#!/usr/bin/env bash
# validate-env.sh — Check required environment variables before starting a service.
# Usage: ./scripts/validate-env.sh [frontend|backend]
set -euo pipefail

REQUIRED_FRONTEND=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  TNB_API_KEY
  INTERNAL_SERVICE_TOKEN
  NEXT_PUBLIC_APP_URL
)

REQUIRED_BACKEND=(
  INTERNAL_SERVICE_TOKEN
  NEXT_PUBLIC_APP_URL
  R2_BUCKET_NAME
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
)

SERVICE=${1:-frontend}
MISSING=()

if [ "$SERVICE" = "frontend" ]; then
  REQUIRED=("${REQUIRED_FRONTEND[@]}")
elif [ "$SERVICE" = "backend" ]; then
  REQUIRED=("${REQUIRED_BACKEND[@]}")
else
  echo "Usage: $0 [frontend|backend]" >&2
  exit 1
fi

for var in "${REQUIRED[@]}"; do
  if [ -z "${!var:-}" ]; then
    MISSING+=("$var")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing required environment variables for $SERVICE:" >&2
  for v in "${MISSING[@]}"; do
    echo "  - $v" >&2
  done
  exit 1
fi

echo "Environment validation passed for $SERVICE service."
