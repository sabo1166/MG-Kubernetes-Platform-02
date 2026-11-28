#!/usr/bin/env bash
# Verifies, AFTER `terraform init`, that Terraform is really using the expected
# S3 remote backend with native locking, and that no local state is in play.
# Read-only: it never writes, migrates or deletes state.
#
# Usage (from the Terraform root module directory):
#   EXPECTED_BUCKET=... EXPECTED_KEY=... EXPECTED_REGION=... verify-tf-backend.sh
set -euo pipefail

fail() { echo "::error title=Backend verification failed::$*"; exit 1; }

: "${EXPECTED_BUCKET:?EXPECTED_BUCKET is not set (repository variable TF_STATE_BUCKET)}"
: "${EXPECTED_KEY:?EXPECTED_KEY is not set}"
: "${EXPECTED_REGION:?EXPECTED_REGION is not set}"

# 1. No local state files may exist next to the configuration.
for f in terraform.tfstate terraform.tfstate.backup; do
  [ -e "$f" ] && fail "Local state file '$f' found. Local state must never be used."
done

# 2. The initialized backend must be S3 with the exact bucket, key, region and locking.
meta=".terraform/terraform.tfstate"
[ -f "$meta" ] || fail "$meta not found: terraform init did not configure a backend."

type=$(jq -r '.backend.type // empty' "$meta")
bucket=$(jq -r '.backend.config.bucket // empty' "$meta")
key=$(jq -r '.backend.config.key // empty' "$meta")
region=$(jq -r '.backend.config.region // empty' "$meta")
lockfile=$(jq -r '.backend.config.use_lockfile // false' "$meta")
encrypt=$(jq -r '.backend.config.encrypt // false' "$meta")

[ "$type" = "s3" ]                   || fail "backend type is '$type', expected 's3'."
[ "$bucket" = "$EXPECTED_BUCKET" ]   || fail "bucket is '$bucket', expected '$EXPECTED_BUCKET'."
[ "$key" = "$EXPECTED_KEY" ]         || fail "key is '$key', expected '$EXPECTED_KEY'."
[ "$region" = "$EXPECTED_REGION" ]   || fail "region is '$region', expected '$EXPECTED_REGION'."
[ "$lockfile" = "true" ]             || fail "use_lockfile is not true."
[ "$encrypt" = "true" ]              || fail "encrypt is not true."

# 3. The remote state must be reachable with the CI credentials (read-only calls).
#    A missing state object (HTTP 404) is accepted: it only means nothing has been
#    applied yet, and the first apply will create it. Access errors (403) fail.
aws s3api head-bucket --bucket "$EXPECTED_BUCKET" >/dev/null \
  || fail "bucket s3://$EXPECTED_BUCKET is not accessible with the CI credentials."
if head_err=$(aws s3api head-object --bucket "$EXPECTED_BUCKET" --key "$EXPECTED_KEY" 2>&1 >/dev/null); then
  terraform state list >/dev/null \
    || fail "remote state in s3://$EXPECTED_BUCKET/$EXPECTED_KEY exists but is not readable."
  echo "Remote state object found and readable."
elif echo "$head_err" | grep -qE '\(404\)|Not Found'; then
  echo "::notice title=Remote state::No state object yet at s3://$EXPECTED_BUCKET/$EXPECTED_KEY (first run). The first apply will create it."
else
  fail "cannot access s3://$EXPECTED_BUCKET/$EXPECTED_KEY: $head_err"
fi

# 4. Advisory only: state buckets should have versioning so state can be recovered.
versioning=$(aws s3api get-bucket-versioning --bucket "$EXPECTED_BUCKET" \
  --query Status --output text 2>/dev/null || echo "unknown")
if [ "$versioning" != "Enabled" ]; then
  echo "::warning title=State bucket versioning::Versioning on s3://$EXPECTED_BUCKET is '$versioning'. Enable it so state can be recovered."
fi

echo "Backend verified: s3://$bucket/$key ($region), use_lockfile=true, encrypt=true, no local state."
