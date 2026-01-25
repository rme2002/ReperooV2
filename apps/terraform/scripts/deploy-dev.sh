#!/bin/bash
set -e

# Deploy to Dev Environment
# This script automates the deployment process for the dev environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../environments/dev"
API_DIR="$PROJECT_ROOT/apps/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Reperoo API - Dev Environment Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform not found${NC}"
    echo "Install it from: https://www.terraform.io/downloads"
    exit 1
fi

# Verify we're in the right project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
EXPECTED_PROJECT="reperoo"

if [ "$CURRENT_PROJECT" != "$EXPECTED_PROJECT" ]; then
    echo -e "${YELLOW}Warning: Current GCP project is '$CURRENT_PROJECT'${NC}"
    echo -e "${YELLOW}Expected project: '$EXPECTED_PROJECT'${NC}"
    read -p "Switch to $EXPECTED_PROJECT? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud config set project "$EXPECTED_PROJECT"
    else
        echo -e "${RED}Aborted${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Step 1: Checking Terraform state bucket${NC}"
BUCKET="gs://reperoo-terraform-state-dev"
if ! gcloud storage buckets describe "$BUCKET" &> /dev/null; then
    echo -e "${YELLOW}State bucket doesn't exist. Creating...${NC}"
    gcloud storage buckets create "$BUCKET" \
        --project=reperoo \
        --location=europe-west4 \
        --uniform-bucket-level-access
    gcloud storage buckets update "$BUCKET" --versioning
    echo -e "${GREEN}State bucket created${NC}"
else
    echo -e "${GREEN}State bucket exists${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Initializing Terraform${NC}"
cd "$TERRAFORM_DIR"
terraform init -upgrade

echo ""
echo -e "${GREEN}Step 3: Planning infrastructure changes${NC}"
terraform plan -out=tfplan

echo ""
read -p "Apply Terraform changes? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    rm -f tfplan
    exit 0
fi

echo ""
echo -e "${GREEN}Step 4: Applying Terraform changes${NC}"
terraform apply tfplan
rm -f tfplan

echo ""
echo -e "${GREEN}Step 5: Checking secrets${NC}"
echo "Verifying dev secrets exist..."

SECRETS=(
    "dev-database-url"
    "dev-supabase-url"
    "dev-supabase-secret-api-key"
    "dev-supabase-jwt-secret"
)

MISSING_SECRETS=()
for secret in "${SECRETS[@]}"; do
    if ! gcloud secrets describe "$secret" &> /dev/null; then
        MISSING_SECRETS+=("$secret")
    else
        # Check if it has a real value (not placeholder)
        VALUE=$(gcloud secrets versions access latest --secret="$secret" 2>/dev/null || echo "")
        if [ "$VALUE" == "PLACEHOLDER_UPDATE_ME" ]; then
            echo -e "${YELLOW}Warning: $secret has placeholder value${NC}"
            MISSING_SECRETS+=("$secret (needs real value)")
        else
            echo -e "${GREEN}✓ $secret${NC}"
        fi
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}The following secrets need to be updated:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "  - $secret"
    done
    echo ""
    echo "Update secrets with:"
    echo '  gcloud secrets versions add SECRET_NAME --data-file=- <<< "value"'
    echo ""
fi

echo ""
echo -e "${GREEN}Step 6: Getting deployment info${NC}"
CLOUD_RUN_URL=$(terraform output -raw cloud_run_url 2>/dev/null || echo "Not deployed")
SERVICE_NAME=$(terraform output -raw cloud_run_service_name 2>/dev/null || echo "N/A")
REPO_URL=$(terraform output -raw artifact_registry_url 2>/dev/null || echo "N/A")

echo "Cloud Run URL: $CLOUD_RUN_URL"
echo "Service Name: $SERVICE_NAME"
echo "Artifact Registry: $REPO_URL"

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update secrets if needed (see warnings above)"
echo "2. Build and push Docker image:"
echo "   cd $API_DIR"
echo "   docker build -t $REPO_URL/api:latest ."
echo "   gcloud auth configure-docker europe-west4-docker.pkg.dev"
echo "   docker push $REPO_URL/api:latest"
echo ""
echo "3. Deploy to Cloud Run:"
echo "   gcloud run services update $SERVICE_NAME \\"
echo "     --image=$REPO_URL/api:latest \\"
echo "     --region=europe-west4"
echo ""
echo "4. Test the deployment:"
echo "   curl $CLOUD_RUN_URL/health"
echo ""
