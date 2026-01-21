#!/bin/bash

# AI Financial Report Generator - Startup Script
# This script cleans up used ports, sets up the database, seeds data, and starts the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     AI Financial Report Generator - Enterprise SaaS          ║"
echo "║                    Startup Script                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to cleanup ports
cleanup_ports() {
    echo -e "${YELLOW}[1/6] Cleaning up ports...${NC}"

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

    echo -e "${GREEN}  ✓ Ports cleaned${NC}"
}

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}[2/6] Checking dependencies...${NC}"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}  ✗ Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi
    echo "  ✓ Node.js $(node --version)"

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
    echo -e "${YELLOW}[3/6] Setting up environment...${NC}"

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "  Creating .env file from template..."
        cp .env.example .env
        echo -e "${YELLOW}  ⚠ Please update .env with your OpenRouter API key${NC}"
    else
        echo "  ✓ .env file exists"
    fi

    # Check for OpenRouter API key
    if grep -q "your_openrouter_api_key_here" .env 2>/dev/null; then
        echo -e "${YELLOW}  ⚠ Warning: OpenRouter API key not set. AI features will not work.${NC}"
    fi

    echo -e "${GREEN}  ✓ Environment configured${NC}"
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}[4/6] Setting up PostgreSQL database...${NC}"

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
    echo -e "${YELLOW}[5/6] Installing dependencies...${NC}"

    # Install root dependencies
    echo "  Installing root dependencies..."
    npm install --silent

    # Install backend dependencies
    echo "  Installing backend dependencies..."
    cd backend && npm install --silent && cd ..

    # Install frontend dependencies
    echo "  Installing frontend dependencies..."
    cd frontend && npm install --silent && cd ..

    echo -e "${GREEN}  ✓ Dependencies installed${NC}"
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}[6/6] Seeding database...${NC}"

    cd backend
    echo "  Running database seed script..."
    node src/seed.js
    cd ..

    echo -e "${GREEN}  ✓ Database seeded with sample data${NC}"
}

# Function to start application
start_application() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗"
    echo "║                  Starting Application                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Starting backend on http://localhost:5001${NC}"
    echo -e "${GREEN}Starting frontend on http://localhost:3000${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the application${NC}"
    echo ""

    # Start backend and frontend concurrently
    npm start
}

# Main execution
main() {
    cleanup_ports
    check_dependencies
    setup_environment
    setup_database
    install_dependencies
    seed_database
    start_application
}

# Run main function
main
