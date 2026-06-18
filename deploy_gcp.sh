#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  CUFET Web Tool — Google Cloud Run Deployment Assistant
# ─────────────────────────────────────────────────────────────

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${CYAN}        CUFET Web Tool — Google Cloud Run Deployment${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Helper function to check CLI installation
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: '$1' command-line tool is not installed.${NC}"
        echo -e "$2"
        exit 1
    fi
}

# 1. Pre-flight checks
echo -e "\n${CYAN}[1/4] Running pre-flight checks...${NC}"
check_command "gcloud" "Please install the Google Cloud SDK. Instructions: https://cloud.google.com/sdk/docs/install"

# Ensure authenticated
echo -e "Checking Google Cloud authentication status..."
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -z "$ACTIVE_ACCOUNT" ]; then
    echo -e "${YELLOW}No active Google Cloud account detected.${NC}"
    echo -e "Please log in using the browser window that opens up."
    gcloud auth login
else
    echo -e "${GREEN}✓ Authenticated as: ${ACTIVE_ACCOUNT}${NC}"
fi

# 2. Project Selection
echo -e "\n${CYAN}[2/4] Google Cloud Project Configuration...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -n "$CURRENT_PROJECT" ]; then
    read -p "Use current project [${CURRENT_PROJECT}]? (Y/n): " USE_CURRENT
    USE_CURRENT=${USE_CURRENT:-y}
    if [[ "$USE_CURRENT" =~ ^[Nn]$ ]]; then
        read -p "Enter Google Cloud Project ID: " PROJECT_ID
    else
        PROJECT_ID=$CURRENT_PROJECT
    fi
else
    read -p "Enter Google Cloud Project ID: " PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID is required.${NC}"
    exit 1
fi

# Set project config
gcloud config set project "$PROJECT_ID"

# 3. Service & Region Configuration
echo -e "\n${CYAN}[3/4] Service & Region Configuration...${NC}"
read -p "Enter Cloud Run service name [cufet-webtool]: " SERVICE_NAME
SERVICE_NAME=${SERVICE_NAME:-cufet-webtool}

read -p "Enter target GCP region [us-central1]: " REGION
REGION=${REGION:-us-central1}

# 4. Deployment execution
echo -e "\n${CYAN}[4/4] Deploying to Google Cloud Run...${NC}"
echo -e "This will upload your source to Cloud Build, build the Nginx container, and deploy it to Cloud Run."
echo -e "${GREEN}Executing: gcloud run deploy $SERVICE_NAME --source . --region $REGION --allow-unauthenticated --port 8080${NC}\n"

read -p "Confirm deployment? (Y/n): " CONFIRM
CONFIRM=${CONFIRM:-y}
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 0
fi

# Run deploy command
gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --region "$REGION" \
    --allow-unauthenticated \
    --port 8080

DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo -e "\n${GREEN}======================================================================${NC}"
    echo -e "${GREEN}✓ Successfully deployed to Google Cloud Run!${NC}"
    echo -e "${GREEN}======================================================================${NC}"
else
    echo -e "\n${RED}======================================================================${NC}"
    echo -e "${RED}✗ Deployment failed. Please review error messages above.${NC}"
    echo -e "${RED}======================================================================${NC}"
fi

exit $DEPLOY_STATUS
