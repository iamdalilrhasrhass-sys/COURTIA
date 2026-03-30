# Option 4 Implementation - AI Cost Management

## 🎯 Objectif
Implémenter un système complet d'optimisation des coûts API Anthropic avec routing intelligent Haiku/Opus et facturation par tier.

## 📋 Tâches

### 1. Modifications Base de Données
- [ ] Ajouter table `api_request_logs` (courtier_id, model_used, cost_estimate, timestamp, request_type)
- [ ] Ajouter colonne `pricing_tier` à table `users` (Starter/Pro/Premium)
- [ ] Ajouter colonne `api_quota_remaining` à table `users`
- [ ] Ajouter table `quota_alerts` (courtier_id, alert_sent_at, quota_percentage)

### 2. Backend Logic
- [ ] Router intelligent: détecter requêtes "complexes" via keywords
- [ ] Fallback Haiku → Opus si confidence < 70%
- [ ] Logger chaque requête (model, coût, timestamp, user_id)
- [ ] Endpoint `/api/admin/costs` pour dashboard
- [ ] Trigger Telegram alert @ 80% quota
- [ ] Reset mensuel de quotas

### 3. Frontend - Admin Dashboard
- [ ] Page `/admin/costs` : table de coûts par courtier
- [ ] Graph: coûts/requêtes par jour, tendance mois
- [ ] Filtres: par tier, par période
- [ ] Export CSV des coûts

### 4. Pricing Integration
- [ ] Ajouter pricing tiers à paramètres système
- [ ] Afficher quota restant au courtier dans son dashboard
- [ ] Webhook: upgrade tier → reset quotas

### 5. Déploiement
- [ ] Render: Backend
- [ ] Vercel: Frontend
- [ ] Vérifier connectivité API

---

## 🔧 Estimation Complexité
- Modèles: LOW (schéma simple)
- Logic: MEDIUM (routing + logging)
- Dashboard: MEDIUM (visualisation)
- Deploy: LOW (une fois que c'est prêt)

**ETA: 2-3 heures complètes + test**
