#!/bin/bash

# CRM Assurance - Database Initialization Script
# Initializes PostgreSQL with the CRM schema

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        CRM ASSURANCE - DATABASE INITIALIZATION             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
DB_NAME="${1:-crm_assurance}"
DB_USER="${2:-postgres}"
DB_HOST="${3:-localhost}"
DB_PORT="${4:-5432}"

echo "📍 Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Host: $DB_HOST:$DB_PORT"
echo ""

# Check if PostgreSQL is available
echo "🔍 Checking PostgreSQL connection..."
if ! psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -c "SELECT 1" &>/dev/null; then
  echo "❌ Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
  echo ""
  echo "💡 Options:"
  echo "   1. Start PostgreSQL locally:"
  echo "      brew services start postgresql@15"
  echo ""
  echo "   2. Use Docker (recommended):"
  echo "      docker-compose up -d"
  echo ""
  exit 1
fi

echo "✅ PostgreSQL is accessible"
echo ""

# Check if database exists
echo "🔍 Checking if database exists..."
if psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -lqt | cut -d\| -f1 | grep -qw "$DB_NAME"; then
  echo "⚠️  Database '$DB_NAME' already exists"
  read -p "   Do you want to drop and recreate it? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Dropping existing database..."
    psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -c "DROP DATABASE IF EXISTS $DB_NAME;"
  else
    echo "⏭️  Skipping database creation"
    exit 0
  fi
fi

# Create database
echo "📁 Creating database '$DB_NAME'..."
psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -c "CREATE DATABASE $DB_NAME;"
echo "✅ Database created"
echo ""

# Import schema
echo "📋 Importing schema..."
SCHEMA_FILE="$(dirname "$0")/../database/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ Schema file not found: $SCHEMA_FILE"
  exit 1
fi

psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -f "$SCHEMA_FILE"
echo "✅ Schema imported successfully"
echo ""

# Verify tables
echo "📊 Verifying tables..."
TABLE_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';")
echo "✅ Created $TABLE_COUNT tables"
echo ""

# List tables
echo "📑 Tables created:"
psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$DB_NAME" -t -c "\dt" | awk '{print "   • " $1}'
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ DATABASE READY!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Next steps:"
echo "   1. Update backend/.env with your database credentials"
echo "   2. Start the backend: cd backend && npm run dev"
echo "   3. Test API: curl http://localhost:3000/api/health"
echo ""
echo "Connection string:"
echo "   postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
