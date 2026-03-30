# Automations - CRM Assurance

## 🤖 Workflows automatisés à construire

### 1. **Relances prospects** ⏳
- Trigger: Prospect en stage "prospection" depuis >7j sans contact
- Action: Message Telegram/WhatsApp personnalisé
- Fréquence: Quotidienne (matin 9h)
- Statut: À développer

### 2. **Rappels RDV** ⏳
- Trigger: RDV dans <24h
- Actions:
  - Envoyer rappel au client (Telegram/WhatsApp/SMS)
  - Générer brief client automatiquement
  - Envoyer brief courtier
- Statut: À développer

### 3. **Génération brief RDV** ⏳
- Trigger: RDV créé ou 24h avant
- Contenu auto-généré:
  - Historique client (contrats actifs, sinistres, commissions)
  - Documents récents
  - Actions à prendre
  - Points de fidélité
- Format: PDF + Email
- Statut: À développer

### 4. **Détection clients silencieux** ⏳
- Trigger: Quotidien
- Condition: Aucun contact depuis 6 mois
- Action: Alert "silent_client" + relance
- Statut: À développer

### 5. **Alertes échéance contrats concurrence** ⏳
- Trigger: Monitoring mensuel
- Action: Vérifier fin contrats clients chez concurrents (LinkedIn, réseau, SMS)
- Résultat: Alert + proposition personnalisée
- Statut: Complexe - À étudier

### 6. **Suivi commissions temps réel** ⏳
- Trigger: Contrat actif ou renouvellement
- Dashboard:
  - Commissions déclarées vs payées
  - Retards paiement
  - Prévisions par assureur
- Statut: À développer

### 7. **Génération rapports DDA & RGPD** ⏳
- Trigger: Mensuel (configurable)
- Contenu auto-généré:
  - DDA: Communications client, conformité
  - RGPD: Audit données personnelles
- Format: PDF + Excel
- Signature: Courtier
- Statut: À développer

### 8. **Envoi/Réception documents via Telegram** ⏳
- Trigger: Client envoie photo document
- Actions:
  - OCR automatique
  - Classification (sinistre, pièce justificative, etc.)
  - Stockage sécurisé
  - Confirmation client
- Statut: À développer

### 9. **Lecture automatique pièces justificatives** ⏳
- Trigger: Upload document
- Actions:
  - Extraction données (OCR)
  - Validation format/contenu
  - Alerte si incomplet
  - Stockage structuré
- Statut: À développer

### 10. **Signature électronique intégrée** ⏳
- Trigger: Document prêt à signer
- Actions:
  - Envoi lien signature (DocuSign/SignRequest)
  - Relance auto après 3j
  - Intégration base de données
  - Notification signature complétée
- Statut: À développer

---

## 🔄 Ordre de développement

**Phase 1 (Rapide):**
1. Relances prospects (Telegram)
2. Rappels RDV (24h avant)
3. Clients silencieux (alerte)

**Phase 2 (Semaines 2-3):**
4. Brief RDV auto-généré
5. Suivi commissions
6. Envoi/réception documents Telegram

**Phase 3 (Semaines 3-4):**
7. OCR et classification
8. Signature électronique
9. Reports DDA/RGPD

**Phase 4 (Advanced):**
10. Détection concurrence
11. Analytics avancées

---

## ⚙️ Configuration Cron / Schedulers

```
0 9 * * * - Relances prospects (quotidien 9h)
0 18 * * * - Alertes fin journée (quotidien 18h)
0 0 * * 0 - Rapports hebdomadaires (dimanche minuit)
0 0 1 * * - Reports mensuels DDA/RGPD (1er du mois)
0 */4 * * * - Sync Google Calendar (toutes les 4h)
```

---

## 🚀 Statut global: 0% → 100% à construire
