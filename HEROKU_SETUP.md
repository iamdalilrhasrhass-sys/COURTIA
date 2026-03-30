# 🚀 HEROKU POSTGRESQL SETUP (5 MINUTES)

**Status**: Fastest way to get PostgreSQL running  
**Time**: ~5-10 minutes  
**Cost**: Free (hobby tier)  
**No local installation needed**: ✅

---

## Step 1: Install Heroku CLI (2 min)

```bash
brew install heroku
heroku login
```

If Homebrew won't work, download from: https://devcenter.heroku.com/articles/heroku-cli

## Step 2: Create Heroku App (1 min)

```bash
heroku create crm-assurance
```

This creates your app + generates unique name if needed.

## Step 3: Add PostgreSQL (1 min)

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

This gives you free PostgreSQL (10,000 rows limit, but enough for MVP).

## Step 4: Get Connection String (1 min)

```bash
heroku config:get DATABASE_URL
```

Output looks like:
```
postgresql://user:password@ec2-xxx.compute-1.amazonaws.com:5432/dbname
```

Copy this!

## Step 5: Update Backend .env (1 min)

```bash
cd ~/Desktop/CRM-Assurance/backend
cp .env.example .env
```

**Edit .env and replace**:
```
DATABASE_URL=postgresql://user:password@ec2-xxx.compute-1.amazonaws.com:5432/dbname
DB_HOST=ec2-xxx.compute-1.amazonaws.com
DB_PORT=5432
DB_USER=user
DB_PASSWORD=password
DB_NAME=dbname
```

(Extract from the DATABASE_URL above)

## Step 6: Import Schema (1 min)

```bash
# Get connection string again
DATABASE_URL=$(heroku config:get DATABASE_URL)

# Import schema
psql $DATABASE_URL < ~/Desktop/CRM-Assurance/database/schema.sql
```

If `psql` command doesn't work locally, use Heroku's tool:

```bash
heroku pg:psql < ~/Desktop/CRM-Assurance/database/schema.sql
```

## Step 7: Verify (1 min)

```bash
heroku pg:info
heroku pg:psql
# At psql prompt:
\dt
# Should list 15+ tables
\q
```

---

## ✅ You're Done!

PostgreSQL is now running on Heroku ☁️

```
Database:  crm_assurance
Host:      ec2-xxx.compute-1.amazonaws.com
Port:      5432
User:      (from DATABASE_URL)
Password:  (from DATABASE_URL)
```

**Backend .env is configured** → Ready for Phase 3!

---

## 🧪 Quick Test

```bash
cd ~/Desktop/CRM-Assurance/backend
npm run dev

# Check logs for:
# "✅ Database connected successfully"
```

---

## 📊 Heroku Free Tier Limits

- **Storage**: 10,000 rows
- **CPU**: Shared (okay for MVP)
- **Data**: You own it
- **SSL**: Automatic

For larger: `heroku addons:upgrade heroku-postgresql:standard-0` (~$50/month)

---

## 💡 Troubleshooting

**Can't run `heroku` command?**
```bash
which heroku
# If not found:
brew install heroku
# Or download from https://devcenter.heroku.com
```

**psql not installed locally?**
```bash
# Use Heroku's psql instead:
heroku pg:psql

# Or install PostgreSQL locally:
brew install postgresql@15
```

**Database not created?**
```bash
heroku pg:psql
CREATE DATABASE crm_assurance;
\q
```

---

## 🎯 Next Steps

1. ✅ Heroku app created
2. ✅ PostgreSQL database created
3. ✅ Schema imported
4. ✅ .env configured
5. → Start backend: `npm run dev`
6. → Phase 3 ready!

---

**Time elapsed**: ~10 minutes  
**Status**: PostgreSQL READY ✅

