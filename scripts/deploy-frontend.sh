#!/usr/bin/env bash
#
# Deploy frontend lên S3 + CloudFront.
#
# Luồng:
#   1. Lấy outputs từ CloudFormation stack (API URL, Cognito, bucket, distribution)
#   2. Ghi packages/frontend/.env.production
#   3. Build frontend
#   4. Sync lên S3 (xóa file cũ)
#   5. Invalidate CloudFront cache
#
# Dùng: AWS_PROFILE=tundut ./scripts/deploy-frontend.sh [stage]
#
set -euo pipefail

STAGE="${1:-dev}"
STACK="CvCoachAi-${STAGE}"
REGION="${AWS_REGION:-ap-southeast-1}"

echo "▶ Deploy frontend cho stage=${STAGE} (region ${REGION})"

# Helper: lấy một output từ stack
get_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

echo "▶ Lấy outputs từ stack ${STACK}..."
API_URL=$(get_output ApiUrl)
USER_POOL_ID=$(get_output UserPoolId)
CLIENT_ID=$(get_output UserPoolClientId)
SITE_BUCKET=$(get_output SiteBucket)
DIST_ID=$(get_output DistributionId)
CF_URL=$(get_output CloudFrontUrl)

if [[ -z "$SITE_BUCKET" || "$SITE_BUCKET" == "None" ]]; then
  echo "✗ Không tìm thấy SiteBucket. Hãy chạy 'cdk deploy' trước."
  exit 1
fi

# API Gateway URL có dấu / cuối; frontend gọi path bắt đầu bằng / nên bỏ / cuối
API_BASE="${API_URL%/}"

echo "▶ Ghi .env.production..."
cat > packages/frontend/.env.production <<EOF
VITE_API_BASE_URL=${API_BASE}
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${CLIENT_ID}
VITE_AWS_REGION=${REGION}
EOF

echo "▶ Build frontend..."
npm run build --workspace @cv-coach/frontend

echo "▶ Sync lên S3 bucket ${SITE_BUCKET}..."
# Assets có hash → cache lâu; index.html → không cache (luôn lấy bản mới)
aws s3 sync packages/frontend/dist "s3://${SITE_BUCKET}" \
  --region "$REGION" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"
aws s3 cp packages/frontend/dist/index.html "s3://${SITE_BUCKET}/index.html" \
  --region "$REGION" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "▶ Invalidate CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --query "Invalidation.Id" --output text

echo ""
echo "✓ Deploy frontend hoàn tất!"
echo "  URL: ${CF_URL}"
