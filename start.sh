#!/bin/bash

# AI Financial Report Generator - Startup Script
# This script cleans up used ports, sets up the database, seeds data, and starts the application
# with hot-reloading enabled for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║          AI Financial Report Generator - Enterprise SaaS             ║"
echo "║                        Startup Script v2.0                           ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to cleanup ports (including 5000 to ensure it's not used)
cleanup_ports() {
    echo -e "${YELLOW}[1/7] Cleaning up ports...${NC}"

    # Kill processes on port 5001 (backend)
    if lsof -ti:5001 > /dev/null 2>&1; then
        echo "  Killing processes on port 5001..."
        kill -9 $(lsof -ti:5001) 2>/dev/null || true
    fi

    # Kill processes on port 3000 (frontend)
    if lsof -ti:3000 > /dev/null 2>&1; then
        echo "  Killing processes on port 3000..."
        kill -9 $(lsof -ti:3000) 2>/dev/null || true
    fi

    # Kill processes on port 5000 (ensure not used)
    if lsof -ti:5000 > /dev/null 2>&1; then
        echo "  Killing processes on port 5000..."
        kill -9 $(lsof -ti:5000) 2>/dev/null || true
    fi

    # Clean up any stale node processes
    pkill -f "node.*nodemon" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true

    sleep 1
    echo -e "${GREEN}  ✓ Ports cleaned (3000, 5000, 5001)${NC}"
}

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}[2/7] Checking dependencies...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}  ✗ Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    echo "  ✓ Node.js $NODE_VERSION"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}  ✗ npm is not installed${NC}"
        exit 1
    fi
    echo "  ✓ npm $(npm --version)"

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}  ✗ PostgreSQL is not installed. Please install PostgreSQL${NC}"
        exit 1
    fi
    echo "  ✓ PostgreSQL $(psql --version | head -n1)"

    echo -e "${GREEN}  ✓ All dependencies satisfied${NC}"
}

# Function to setup environment
setup_environment() {
    echo -e "${YELLOW}[3/7] Setting up environment...${NC}"

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "  Creating .env file from template..."
        if [ -f .env.example ]; then
            cp .env.example .env
        else
            cat > .env << 'EOF'
# OpenRouter API Key - Add your key here
OPENROUTER_API_KEY="your_openrouter_api_key_here"
OPENROUTER_MODEL="anthropic/claude-haiku-4.5"

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/financial_reports
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_reports
DB_USER=postgres
DB_PASSWORD=postgres

# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
EOF
        fi
        echo -e "${YELLOW}  ⚠ Please update .env with your OpenRouter API key${NC}"
    else
        echo "  ✓ .env file exists"
    fi

    # Check for OpenRouter API key
    if grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
        echo -e "${YELLOW}  ⚠ Warning: OpenRouter API key not set. AI features will not work.${NC}"
    else
        echo "  ✓ OpenRouter API key configured"
    fi

    # Verify PORT is 5001 (not 5000)
    if grep -q "PORT=5000" .env 2>/dev/null; then
        echo "  Updating PORT from 5000 to 5001..."
        sed -i '' 's/PORT=5000/PORT=5001/' .env 2>/dev/null || sed -i 's/PORT=5000/PORT=5001/' .env
    fi

    echo -e "${GREEN}  ✓ Environment configured${NC}"
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}[4/7] Setting up PostgreSQL database...${NC}"

    # Load database configuration from .env
    export $(cat .env | grep -v '^#' | xargs)

    DB_NAME=${DB_NAME:-financial_reports}
    DB_USER=${DB_USER:-postgres}
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}

    # Check if PostgreSQL is running
    if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
        echo -e "${RED}  ✗ PostgreSQL is not running. Please start PostgreSQL.${NC}"
        echo "    On macOS: brew services start postgresql"
        echo "    On Linux: sudo systemctl start postgresql"
        exit 1
    fi
    echo "  ✓ PostgreSQL is running"

    # Create database if it doesn't exist
    echo "  Creating database '$DB_NAME' if it doesn't exist..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME" 2>/dev/null || true

    echo -e "${GREEN}  ✓ Database ready${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}[5/7] Installing dependencies...${NC}"

    # Install root dependencies
    echo "  Installing root dependencies..."
    npm install --silent 2>/dev/null || npm install

    # Install backend dependencies
    echo "  Installing backend dependencies..."
    cd backend && npm install --silent 2>/dev/null || npm install && cd ..

    # Install frontend dependencies
    echo "  Installing frontend dependencies..."
    cd frontend && npm install --silent 2>/dev/null || npm install && cd ..

    echo -e "${GREEN}  ✓ Dependencies installed${NC}"
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}[6/7] Seeding database with sample data...${NC}"

    cd backend
    echo "  Running database seed script..."
    echo "  This will create 15+ items for each feature..."
    node src/seed.js
    cd ..

    echo -e "${GREEN}  ✓ Database seeded with sample data${NC}"
}

# Function to display feature summary
display_features() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════════╗"
    echo "║                    Available AI Features                             ║"
    echo "╠══════════════════════════════════════════════════════════════════════╣"
    echo "║  • AI Presentation Generator  - Auto-create slides from reports     ║"
    echo "║  • AI Variance Explainer      - Explain budget vs actual differences║"
    echo "║  • AI Forecast Generator      - Predictive financial modeling       ║"
    echo "║  • AI Audit Trail Analyzer    - Compliance documentation            ║"
    echo "║  • AI Board Report Writer     - Executive summary generation        ║"
    echo "║  • AI Expense Categorizer     - Smart expense classification        ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to start application with hot-reloading
start_application() {
    echo -e "${YELLOW}[7/7] Starting Application with Hot-Reload...${NC}"
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗"
    echo "║                  Starting Application                               ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Backend API:    http://localhost:5001${NC}"
    echo -e "${GREEN}Frontend App:   http://localhost:3000${NC}"
    echo ""
    echo -e "${CYAN}Login Credentials:${NC}"
    echo -e "  Email:    ${YELLOW}demo@financialreports.ai${NC}"
    echo -e "  Password: ${YELLOW}demo123456${NC}"
    echo ""
    echo -e "${CYAN}Hot-Reload Enabled:${NC}"
    echo -e "  • Backend changes will auto-restart (nodemon)"
    echo -e "  • Frontend changes will auto-refresh (React Fast Refresh)"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the application${NC}"
    echo ""

    # Start backend and frontend concurrently with hot-reload
    # Using npm run dev which uses concurrently with nodemon for backend
    npm run dev
}

# Main execution
main() {
    cleanup_ports
    check_dependencies
    setup_environment
    setup_database
    install_dependencies
    seed_database
    display_features
    start_application
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Shutting down...${NC}"; cleanup_ports; exit 0' INT TERM

# Run main function
main
