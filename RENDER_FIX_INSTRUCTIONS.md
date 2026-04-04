# 🔧 FIX INSTRUCTIONS — COURTIA DATABASE CONNECTION

## Diagnostic
✅ **Data verified in Frankfurt crm_assurance:**
- Clients: 43 ✅
- Quotes: 40 ✅
- Status: READY TO USE

❌ **Oregon courtia-db:**
- Status: UNREACHABLE
- Likely: Backend is pointing here (wrong DB)

---

## ACTION REQUISE

### Step 1: Render Dashboard → Backend Service

1. Go to: https://dashboard.render.com
2. Click service: **`courtia-onrender`** (ou le nom du backend service)
3. Go to tab: **Environment**

### Step 2: Update DATABASE_URL

**Find variable:** `DATABASE_URL`

**Current value (probably):**
```
postgresql://courtia_db_user:Courtia2026!@dpg-cmn5fqfqf0us73aq5d10-a.oregon-postgres.render.com:5432/crm_assurance
```

**Replace with:**
```
postgresql://crm_assurance_user:FhVu5BCbU9NNKy7TkSQX1RgEVNkFzZz0@dpg-d754sspaae7s73br85kg-a.frankfurt-postgres.render.com:5432/crm_assurance
```

**Save & Deploy**

### Step 3: Restart Backend Service

1. In Render dashboard, click service `courtia-onrender`
2. Click button: **Manual Deploy**
3. Wait ~2-3 minutes for restart
4. Check status: Green = Ready

### Step 4: Verify Connection

Visit: https://courtia.vercel.app
- Dashboard should show: **43 clients** ✅
- Page Clients should list all 43 ✅
- Contrats page should show 40 quotes ✅

---

## Expected Result

After restart, the app should display:
- ✅ 43 clients (with colored risk scores 38-72)
- ✅ 40 contrats/quotes
- ✅ 10 tâches/appointments
- ✅ Real KPIs (clients, contrats, commissions)
- ✅ Working fiches & ARK

---

**Done? Reply with status. ARK will run final validation (8 captures).**
