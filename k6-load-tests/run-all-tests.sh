#!/bin/bash

##########################################################
# k6 Load Test Runner - Complete Test Suite
#
# ⚠️ WARNING: Running all tests will BRUTAL attack your
# production services. Recommended order:
# 1. Run smoke test first
# 2. If smoke passes, run stress test
# 3. Only run spike & cascade if you want to prove failure
##########################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Auto-load .env file if it exists
if [ -f ".env" ]; then
    echo -e "${BLUE}📂 Loading environment variables from .env file...${NC}"

    # Load .env and strip Windows line endings (\r)
    set -a
    source <(sed 's/\r$//' .env | grep -v '^#' | grep -v '^$')
    set +a

    echo -e "${GREEN}✅ Environment variables loaded from .env${NC}"
fi

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed!${NC}"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    echo ""
    echo "Quick install:"
    echo "  macOS:   brew install k6"
    echo "  Ubuntu:  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "           echo 'deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main' | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "           sudo apt-get update && sudo apt-get install k6"
    echo "  Windows: choco install k6"
    exit 1
fi

# Check if service URLs are configured
echo -e "${BLUE}🔍 Checking service URL configuration...${NC}"
if [ -z "$USER_SERVICE_URL" ]; then
    echo -e "${YELLOW}⚠️  USER_SERVICE_URL not set in environment${NC}"
    echo "Set your Vercel URLs before running tests:"
    echo ""
    echo "export USER_SERVICE_URL=https://your-user-service.vercel.app"
    echo "export WALLET_SERVICE_URL=https://your-wallet-service.vercel.app"
    echo "export PAYMENT_SERVICE_URL=https://your-payment-service.vercel.app"
    echo "export NOTIFICATION_SERVICE_URL=https://your-notification-service.vercel.app"
    echo "export CREDIT_SERVICE_URL=https://your-credit-service.vercel.app"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create results directory
RESULTS_DIR="./results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "${GREEN}📁 Results will be saved to: $RESULTS_DIR${NC}"
echo ""

##########################################################
# Function to run a single test
##########################################################
run_test() {
    local test_name=$1
    local test_file=$2
    local severity=$3

    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}🧪 Running: $test_name${NC}"
    echo -e "${BLUE}========================================${NC}\n"

    if [ "$severity" == "EXTREME" ]; then
        echo -e "${RED}⚠️⚠️⚠️  EXTREME WARNING  ⚠️⚠️⚠️${NC}"
        echo -e "${RED}This test will likely CRASH your services!${NC}"
        echo ""
        read -p "Are you SURE you want to continue? (yes/NO) " -r
        echo
        if [[ ! $REPLY =~ ^yes$ ]]; then
            echo -e "${YELLOW}Skipped $test_name${NC}"
            return
        fi
    fi

    # Run k6 test
    k6 run "$test_file" \
        --out json="$RESULTS_DIR/${test_name}-results.json" \
        --summary-export="$RESULTS_DIR/${test_name}-summary.json"

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "\n${GREEN}✅ $test_name completed${NC}"
    else
        echo -e "\n${RED}❌ $test_name failed (exit code: $exit_code)${NC}"
        echo -e "${YELLOW}Check results in: $RESULTS_DIR/${NC}"

        # Ask if user wants to continue
        if [ "$severity" != "NORMAL" ]; then
            read -p "Continue with remaining tests? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi

    # Cooldown period between tests
    if [ "$severity" == "EXTREME" ] || [ "$severity" == "HIGH" ]; then
        echo -e "${YELLOW}⏳ Cooling down for 30 seconds...${NC}"
        sleep 30
    else
        sleep 5
    fi
}

##########################################################
# Test execution
##########################################################

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║         k6 Load Test Suite - Production Attack       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Parse command line arguments
if [ "$1" == "smoke" ]; then
    run_test "smoke-test" "./01-smoke-test.js" "NORMAL"
elif [ "$1" == "stress" ]; then
    run_test "stress-test" "./02-stress-test.js" "HIGH"
elif [ "$1" == "spike" ]; then
    run_test "spike-test" "./03-spike-test.js" "EXTREME"
elif [ "$1" == "cascade" ]; then
    run_test "cascading-failure-test" "./04-cascading-failure-test.js" "EXTREME"
elif [ "$1" == "all" ]; then
    # Run all tests in sequence
    run_test "smoke-test" "./01-smoke-test.js" "NORMAL"
    run_test "stress-test" "./02-stress-test.js" "HIGH"
    run_test "spike-test" "./03-spike-test.js" "EXTREME"
    run_test "cascading-failure-test" "./04-cascading-failure-test.js" "EXTREME"
else
    echo "Usage: ./run-all-tests.sh [test-name]"
    echo ""
    echo "Available tests:"
    echo "  smoke    - Baseline verification (10 VUs, 1 min)"
    echo "  stress   - Gradual load increase (0→500 VUs, 10 min)"
    echo "  spike    - Instant traffic surge (500 VUs instant, 5 min)"
    echo "  cascade  - Prove cascading failures (300 VUs focused, 5 min)"
    echo "  all      - Run all tests sequentially"
    echo ""
    echo "Examples:"
    echo "  ./run-all-tests.sh smoke"
    echo "  ./run-all-tests.sh all"
    exit 1
fi

##########################################################
# Final summary
##########################################################

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Test suite completed!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "📊 Results location: ${BLUE}$RESULTS_DIR${NC}"
echo -e "\nTo view detailed results:"
echo -e "  JSON: cat $RESULTS_DIR/*-results.json | jq"
echo -e "  Summary: cat $RESULTS_DIR/*-summary.json | jq"
echo ""

# Generate simple HTML report if results exist
if [ -f "$RESULTS_DIR/smoke-test-summary.json" ]; then
    echo -e "${BLUE}Generating HTML report...${NC}"
    # You can add k6 html report generation here if needed
fi

echo -e "${YELLOW}⚠️  Don't forget to check your cloud provider bills!${NC}"
echo -e "${YELLOW}⚠️  Monitor your Vercel and Neon usage dashboards${NC}"
