#!/bin/bash

# PostgreSQL macOS Setup - No Homebrew needed
# Uses official PostgreSQL installer

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PostgreSQL Setup for macOS (No Homebrew)              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if PostgreSQL is already installed
if which psql > /dev/null 2>&1; then
    echo "✅ PostgreSQL already installed!"
    psql --version
    echo ""
    
    # Try to create database
    echo "📁 Creating database..."
    psql -U postgres -c "CREATE DATABASE IF NOT EXISTS crm_assurance;" 2>/dev/null || {
        echo "⚠️  Cannot create database (might need password)"
        echo "Try: createdb -U postgres crm_assurance"
        exit 1
    }
    
    echo "✅ Database created/already exists"
    echo ""
    
    # Import schema
    echo "📋 Importing schema..."
    SCHEMA_FILE="$(dirname "$0")/../database/schema.sql"
    
    if [ -f "$SCHEMA_FILE" ]; then
        psql -U postgres -d crm_assurance -f "$SCHEMA_FILE" 2>/dev/null && {
            echo "✅ Schema imported successfully!"
        } || {
            echo "⚠️  Schema import had issues (might be already imported)"
        }
    else
        echo "❌ Schema file not found: $SCHEMA_FILE"
        exit 1
    fi
    
    echo ""
    echo "✅ PostgreSQL setup complete!"
    echo ""
    echo "Connection string:"
    echo "  postgresql://postgres@localhost:5432/crm_assurance"
    echo ""
else
    echo "❌ PostgreSQL not found in PATH"
    echo ""
    echo "Options:"
    echo "1. Download from: https://www.postgresql.org/download/macosx/"
    echo "2. Or use: brew install postgresql@15 (requires Homebrew permissions fix)"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi
