#!/bin/bash

# ===================================
# CRM Assurance - Option 4 Deployment
# Deploy to Render (Backend) + Vercel (Frontend)
# ===================================

set -e  # Exit on any error

echo "🚀 CRM Assurance Option 4 Deployment"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v git >/dev/null 2>&1 || { echo "❌ git not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found"; exit 1; }

# Option to skip frontend/backend
DEPLOY_BACKEND=${1:-"both"}
DEPLOY_FRONTEND=${2:-"both"}

echo "✅ Prerequisites OK"
echo ""

# ===== BACKEND DEPLOYMENT =====

if [[ "$DEPLOY_BACKEND" == "backend" ]] || [[ "$DEPLOY_BACKEND" == "both" ]]; then
    echo "🔧 BACKEND DEPLOYMENT (Render)"
    echo "==============================="
    
    cd backend
    
    # Check Node modules
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Lint check
    echo "✓ Backend dependencies ready"
    
    # Check for required .env
    if [ ! -f ".env" ]; then
        echo ""
        echo "⚠️  .env file not found"
        echo "   Create backend/.env with:"
        echo "   - ANTHROPIC_API_KEY=sk-ant-..."
        echo "   - DATABASE_URL=postgresql://..."
        echo "   - JWT_SECRET=..."
        echo "   - TELEGRAM_BOT_TOKEN=..."
        echo ""
        echo "   Then re-run deployment"
        exit 1
    fi
    
    # Build check
    echo "🔨 Building backend..."
    node -c server.js > /dev/null 2>&1 && echo "✓ Syntax check passed" || {
        echo "❌ Backend syntax error"
        exit 1
    }
    
    # Push to git (Render will auto-deploy)
    echo ""
    echo "📤 Pushing to git (Render will auto-deploy)..."
    cd ..
    
    if git status > /dev/null 2>&1; then
        git add -A
        git commit -m "feat: Option 4 implementation - AI cost management" || true
        git push origin main
        echo "✅ Backend pushed to git (Render building...)"
        echo ""
        echo "📍 Backend URL will be available at:"
        echo "   https://crm-assurance-api.onrender.com"
        echo ""
    else
        echo "⚠️  Not a git repo, manual deployment needed"
    fi
fi

# ===== FRONTEND DEPLOYMENT =====

if [[ "$DEPLOY_FRONTEND" == "frontend" ]] || [[ "$DEPLOY_FRONTEND" == "both" ]]; then
    echo "🎨 FRONTEND DEPLOYMENT (Vercel)"
    echo "================================"
    
    cd frontend
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Check for .env
    if [ ! -f ".env.production" ] && [ ! -f ".env.local" ]; then
        echo ""
        echo "⚠️  .env.production or .env.local not found"
        echo "   Create frontend/.env.production with:"
        echo "   VITE_API_BASE_URL=https://crm-assurance-api.onrender.com"
        echo ""
    fi
    
    # Build check
    echo "🔨 Building frontend..."
    npm run build > /dev/null 2>&1 && echo "✓ Build successful" || {
        echo "❌ Frontend build failed"
        exit 1
    }
    
    # Push to git
    echo ""
    echo "📤 Pushing to git (Vercel will auto-deploy)..."
    cd ..
    
    if git status > /dev/null 2>&1; then
        git add -A
        git commit -m "feat: Option 4 UI - Cost dashboard & usage tracking" || true
        git push origin main
        echo "✅ Frontend pushed to git (Vercel building...)"
        echo ""
        echo "📍 Frontend URL will be available at:"
        echo "   https://crm-assurance.vercel.app"
        echo ""
    else
        echo "⚠️  Not a git repo, manual deployment needed"
    fi
fi

# ===== POST DEPLOYMENT =====

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Next Steps:"
echo "   1. Verify database migration:"
echo "      psql -U postgres -d crm_assurance -f database/migrations/001_option4_ai_cost_management.sql"
echo ""
echo "   2. Configure environment variables in Render:"
echo "      - ANTHROPIC_API_KEY"
echo "      - DATABASE_URL"
echo "      - JWT_SECRET"
echo "      - TELEGRAM_BOT_TOKEN"
echo ""
echo "   3. Wait for builds to complete:"
echo "      Backend: https://dashboard.render.com"
echo "      Frontend: https://vercel.com/dashboard"
echo ""
echo "   4. Test endpoints:"
echo "      curl https://crm-assurance-api.onrender.com/health"
echo "      curl https://crm-assurance.vercel.app"
echo ""
echo "   5. Monitor costs:"
echo "      Admin Dashboard: https://crm-assurance.vercel.app/admin/costs"
echo "      Personal Usage: https://crm-assurance.vercel.app/my-usage"
echo ""
echo "🎉 ARK is live!"
