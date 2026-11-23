#!/usr/bin/env bash
# Build, tag and push both images to ECR. Run manually; nothing calls this automatically.
# Credentials come from your AWS CLI environment (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY).
#
# Usage: IMAGE_TAG=$(git rev-parse --short HEAD) AWS_REGION=us-east-1 ./scripts/ecr-push.sh
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:?set IMAGE_TAG, e.g. IMAGE_TAG=\$(git rev-parse --short HEAD)}"
FRONTEND_REPO="${FRONTEND_REPO:-mg-k8s-platform-02-frontend}"
BACKEND_REPO="${BACKEND_REPO:-mg-k8s-platform-02-api}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

docker build -t "$REGISTRY/$FRONTEND_REPO:$IMAGE_TAG" app/frontend
docker build -t "$REGISTRY/$BACKEND_REPO:$IMAGE_TAG" app/backend

# Repositories are immutable: pushing an existing tag fails. Use a new tag per build.
docker push "$REGISTRY/$FRONTEND_REPO:$IMAGE_TAG"
docker push "$REGISTRY/$BACKEND_REPO:$IMAGE_TAG"

echo "Pushed $IMAGE_TAG to $REGISTRY"
