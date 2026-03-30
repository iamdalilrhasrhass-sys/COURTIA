# Option 4 Implementation - Deployment Guide

## 🎯 What's Been Implemented

### 1. Intelligent AI Routing
- **Haiku by default** for standard requests (emails, templates, relances)
- **Opus automatic upgrade** for complex queries (keywords: analyser, stratégie, prévoir, etc.)
- **Fallback mechanism**: If Opus fails, retry with Haiku at reduced confidence (0.7)

### 2. Database Schema
✅ Tables created:
- `api_request_logs` - Track all API calls (model, cost, tokens, status)
- `api_quota_alerts` - Track quota threshold alerts
- `pricing_config` - Define pricing tiers (Starter/Pro/Premium)

✅ Columns added to `users`:
- `pricing_tier` - VARCHAR(50) DEFAULT 'Starter'
- `api_quota_remaining` - INT DEFAULT 50
- `api_quota_reset_at` - TIMESTAMP

### 3. Backend Services

#### aiCostManager.js
```javascript
callAiWithQuotaManagement(pool, userId, prompt, requestType, systemPrompt)
```
- Detects complex queries
- Checks user quota
- Logs every API request with cost calculation
- Sends Telegram alerts at 80% quota
- Calculates actual costs in USD

**Model costs (as of 2024):**
- Haiku: $0.80 / 1M input, $4.00 / 1M output
- Opus: $20 / 1M input, $60 / 1M output

#### Routes Implemented

**ARK Endpoints:**
- `POST /api/ark/ask` - Ask question with quota management
- `GET /api/ark/my-usage` - Personal usage stats
- `POST /api/ark/upgrade-tier` - Upgrade pricing tier

**Admin Endpoints:**
- `GET /api/admin/costs` - Dashboard overview (KPIs, top users, trends)
- `GET /api/admin/costs/by-user` - Detailed costs per user
- `GET /api/admin/costs/export` - Export CSV of all costs
- `GET /api/admin/quota-status/:userId` - Check individual quota

### 4. Frontend Pages

#### AdminCostsDashboard.jsx
Admin dashboard showing:
- KPI cards: Active users, total requests, total cost, avg cost/request
- Trends chart: Requests per day (Haiku vs Opus)
- Request distribution pie chart
- Top 10 users by cost (with tier, quota usage)
- Request type breakdown

#### MyUsage.jsx
Personal courtier page showing:
- Current tier (with upgrade button)
- Haiku quota progress bar
- Opus quota progress bar
- Monthly statistics (requests, total cost, avg cost)
- Recent 20 API requests log
- Auto-refresh every 30s

### 5. Pricing Tiers

| Tier | Monthly Price | Haiku/Month | Opus/Month | Features |
|------|--------------|-------------|-----------|----------|
| **Starter** | €15 | 50 | 0 | Haiku only, email support, basic dashboard |
| **Pro** | €50 | 200 | 20 | Haiku + limited Opus, priority support, advanced dashboard |
| **Premium** | €200 | Unlimited | 100 | All features, 24/7 support, custom API |

### 6. Cost Model

**Example: 100 courtiers (40% Starter, 50% Pro, 10% Premium)**

```
Revenue: (40×€15) + (50×€50) + (10×€200) = €5,100/month

Typical usage:
- Starter: ~30 Haiku requests/month @ €0.002/req = €0.06
- Pro: ~150 Haiku + 10 Opus = €0.30 + €0.50 = €0.80
- Premium: ~400 Haiku + 50 Opus = €1.60 + €2.50 = €4.10

API Costs: 40×€0.06 + 50×€0.80 + 10×€4.10 = €54/month
Margin: €5,100 - €54 = €5,046 (99% margin!)
```

### 7. Alerts & Monitoring

**Telegram Alerts (automatic at 80% quota):**
```
⚠️ Quota API atteint 80%

Courtier: Jean Dupont
Modèle: HAIKU
Quota mensuel: 50 requêtes

Upgrader votre plan pour continuer.
```

**Alert conditions:**
- 80% threshold crossed
- 95% threshold crossed
- 100% (quota exceeded)

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Phase 1: Database Migration

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost -d crm_assurance

# Run migration
\i database/migrations/001_option4_ai_cost_management.sql

# Verify
SELECT * FROM pricing_config;
```

### Phase 2: Backend Deployment (Render)

#### Prerequisites:
- Docker installed
- Render account (https://render.com)
- Git repository linked

#### Steps:

1. **Create Web Service on Render:**
   ```
   - Name: crm-assurance-api
   - Environment: Node
   - Build Command: npm install
   - Start Command: node server.js
   - Environment variables:
     - ANTHROPIC_API_KEY=sk-ant-...
     - DATABASE_URL=postgresql://user:pass@host/crm_assurance
     - JWT_SECRET=your_secret
     - TELEGRAM_BOT_TOKEN=your_token
     - NODE_ENV=production
   ```

2. **Deploy:**
   ```bash
   git push origin main
   # Render auto-deploys from main branch
   ```

3. **Get URL:**
   - Backend URL: `https://crm-assurance-api.onrender.com`

### Phase 3: Frontend Deployment (Vercel)

#### Prerequisites:
- Vercel account (https://vercel.com)
- GitHub account linked

#### Steps:

1. **Link GitHub repo to Vercel**
2. **Configure environment variables:**
   ```
   VITE_API_BASE_URL=https://crm-assurance-api.onrender.com
   ```

3. **Deploy:**
   - Vercel auto-deploys on git push to main

4. **Get URL:**
   - Frontend URL: `https://crm-assurance.vercel.app`

---

## 📊 Usage Examples

### API Call with Quota Management

```bash
curl -X POST http://localhost:3000/api/ark/ask \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Analyser les sinistres du client Dupont",
    "requestType": "analysis"
  }'
```

**Response:**
```json
{
  "response": "Basé sur les données...",
  "model": "claude-3-5-opus-20241022",
  "tokens": {"input": 150, "output": 300},
  "costUsd": 0.0125,
  "fallbackUsed": false
}
```

### Check Personal Usage

```bash
curl -X GET http://localhost:3000/api/ark/my-usage \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "tier": "Pro",
  "monthlyPrice": 50,
  "haiku": {
    "quota": 200,
    "used": 145,
    "remaining": 55,
    "percentUsed": 72
  },
  "opus": {
    "quota": 20,
    "used": 8,
    "remaining": 12,
    "percentUsed": 40
  },
  "totalCostThisMonth": 4.25,
  "totalRequests": 153
}
```

### Admin Dashboard

```bash
curl -X GET http://localhost:3000/api/admin/costs \
  -H "Authorization: Bearer {admin_token}"
```

---

## 🔄 Monthly Quota Reset

Add to your cron scheduler (runs on 1st of month at 00:01):

```bash
# Reset quotas
psql -U postgres -h localhost -d crm_assurance \
  -c "SELECT reset_monthly_quotas();"
```

Or via backend endpoint (admin only):
```bash
curl -X POST http://localhost:3000/api/admin/reset-quotas \
  -H "Authorization: Bearer {admin_token}"
```

---

## 📈 Monitoring Checklist

Daily:
- [ ] Check total API costs (should be ~€54/day for 100 users)
- [ ] Monitor for quota alerts in Telegram
- [ ] Check for failed requests

Weekly:
- [ ] Review top 10 users by cost
- [ ] Check request type distribution
- [ ] Verify Haiku/Opus ratio (should be ~80/20)

Monthly:
- [ ] Export CSV costs
- [ ] Reset quotas (automated)
- [ ] Review tier distribution
- [ ] Plan for next month growth

---

## 🆘 Troubleshooting

### Issue: Quota exceeded error
**Solution:** Check user's pricing_tier and monthly usage
```sql
SELECT u.id, u.pricing_tier, COUNT(*) as requests
FROM api_request_logs arl
JOIN users u ON arl.user_id = u.id
WHERE DATE_TRUNC('month', arl.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY u.id, u.pricing_tier
ORDER BY requests DESC;
```

### Issue: Telegram alerts not sending
**Check:** 
- [ ] TELEGRAM_BOT_TOKEN set
- [ ] User has telegram_user_id in users table
- [ ] Telegram service is running

### Issue: High Opus usage
**Optimize:**
- [ ] Review keyword list for complex query detection
- [ ] Add more keywords to trigger Haiku
- [ ] Lower confidence threshold for fallback

---

## 📞 Support

For questions:
- Backend logs: Check Render dashboard → Logs
- Database issues: Check PostgreSQL logs
- Frontend errors: Check browser console + Vercel logs

---

**Status:** ✅ Ready for Production
**Last Updated:** 2026-03-30
**Implemented by:** ARK
