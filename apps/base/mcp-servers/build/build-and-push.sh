#!/bin/bash
# MCP Servers Build and Push Script
# Run this script on your laptop or homelab to build and push images to Docker Hub
#
# Prerequisites:
#   - Docker installed and running
#   - Logged into Docker Hub: docker login
#
# Usage:
#   ./build-and-push.sh              # Build and push all images
#   ./build-and-push.sh azure        # Build and push only Azure MCP
#   ./build-and-push.sh excel        # Build and push only Excel MCP

set -e

# Configuration
DOCKER_USERNAME="quazmoz"
TAG="${TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

build_azure_mcp() {
    print_header "Building Azure MCP Server"
    
    local IMAGE_NAME="${DOCKER_USERNAME}/azure-mcp:${TAG}"
    
    docker build \
        -f "${SCRIPT_DIR}/Dockerfile.azure-mcp" \
        -t "${IMAGE_NAME}" \
        "${SCRIPT_DIR}"
    
    print_success "Built ${IMAGE_NAME}"
    
    print_header "Pushing Azure MCP Server"
    docker push "${IMAGE_NAME}"
    print_success "Pushed ${IMAGE_NAME}"
}

build_excel_mcp() {
    print_header "Building Excel MCP Server"
    
    local IMAGE_NAME="${DOCKER_USERNAME}/excel-mcp:${TAG}"
    
    docker build \
        -f "${SCRIPT_DIR}/Dockerfile.excel-mcp" \
        -t "${IMAGE_NAME}" \
        "${SCRIPT_DIR}"
    
    print_success "Built ${IMAGE_NAME}"
    
    print_header "Pushing Excel MCP Server"
    docker push "${IMAGE_NAME}"
    print_success "Pushed ${IMAGE_NAME}"
}

# Check Docker is available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

# Check logged into Docker Hub
if ! docker info 2>/dev/null | grep -q "Username"; then
    print_warning "You may not be logged into Docker Hub. Run 'docker login' first."
fi

# Main logic
case "${1}" in
    azure)
        build_azure_mcp
        ;;
    excel)
        build_excel_mcp
        ;;
    *)
        build_azure_mcp
        echo ""
        build_excel_mcp
        ;;
esac

echo ""
print_success "All done! Images are available on Docker Hub:"
echo "  - ${DOCKER_USERNAME}/azure-mcp:${TAG}"
echo "  - ${DOCKER_USERNAME}/excel-mcp:${TAG}"
