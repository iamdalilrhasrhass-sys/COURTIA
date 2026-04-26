# COURTIA — Document Maître v2.0 — 25 Avril 2026
## Session Messaging Automatique — Résumé

---

### SHA FINAL
```
171640f297d8dadfc8c6ad2fa27e9aebb271bb7c
```
Branch: `main` | GitHub: `iamdalilrhasrhass-sys/COURTIA`

---

### ARCHITECTURE MESSAGING — 100% GRATUIT

```
┌─────────────────────────────────────────────────────────┐
│                    COURTIA MESSAGING                     │
├───────────┬──────────────┬──────────────┬───────────────┤
│   EMAIL   │     SMS      │  WHATSAPP    │   INBOUND     │
│ nodemailer│  TextBelt    │   Baileys    │  IMAP Gmail   │
│  GRATUIT  │  GRATUIT     │  GRATUIT    │  GRATUIT      │
│   ✅ Fait │  ✅ Fait     │  ✅ Fait    │  ✅ Fait      │
└───────────┴──────────────┴──────────────┴───────────────┘
         ↘           ↓           ↙
        ┌──────────────────────────┐
        │   messagingService.js    │  Orchestrateur
        │   sendMessage()          │
        │   sendBulk()             │
        │   getHistory()           │
        └──────────────────────────┘
                    ↓
        ┌──────────────────────────┐
        │   inboundProcessor.js    │  Analyse IA Claude
        │   processInboundEmail()  │
        └──────────────────────────┘
                    ↓
        ┌──────────────────────────┐
        │   relanceScheduler.js    │  Cron 09:00
        │   runDailyRelances()     │  J+1, J+3, J+7
        └──────────────────────────┘
```

---

### FICHIERS CRÉÉS/MODIFIÉS (18 fichiers, +4070 lignes)

#### Services (backend/src/services/)
| Fichier | Rôle |
|---------|------|
| `messagingService.js` | Orchestrateur central — route email/SMS/WhatsApp |
| `smsService.js` | SMS via TextBelt (API gratuite) |
| `whatsappService.js` | WhatsApp via Baileys (scan QR, session persistante) |
| `imapService.js` | Lecture emails entrants Gmail (IMAP polling) |
| `inboundProcessor.js` | Analyse IA Claude des réponses entrantes |

#### Jobs & Routes
| Fichier | Rôle |
|---------|------|
| `routes/messaging.js` | 8 endpoints API REST |
| `jobs/relanceScheduler.js` | Cron quotidien 09:00 — relances J+1, J+3, J+7 |

#### Base de données
| Fichier | Rôle |
|---------|------|
| `db/migrations/004_messaging_system.sql` | Table `messages` + colonne `preferred_canal` |
| `db/migrations/004_relances_messages.sql` | Table `relances` + `messages` |

#### Modifié
| Fichier | Changement |
|---------|-----------|
| `server.js` | Intégration WhatsApp + IMAP + Relances + Route messaging |
| `ClientDetail.jsx` | Onglet Messages (historique + boutons ARK) |
| `.env.example` | Variables SMS, WhatsApp, IMAP |

---

### ENDPOINTS API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/messaging/send` | Envoyer message à 1 client |
| POST | `/api/messaging/send-bulk` | Envoi groupé |
| GET | `/api/messaging/history/:clientId` | Historique messages |
| GET | `/api/messaging/channels` | Canaux disponibles |
| POST | `/api/messaging/webhook/inbound` | Webhook réponses entrantes |
| GET | `/api/messaging/status` | État WhatsApp/IMAP/Relances |
| POST | `/api/messaging/relance/trigger` | Relance manuelle 1 client |
| POST | `/api/messaging/relance/trigger-all` | Relance tous clients |

---

### COMMENT DALIL SCANNE LE QR CODE WHATSAPP

1. Déployer le backend sur Render
2. Dans les logs Render, un QR code apparaît au démarrage
3. Sur le téléphone : WhatsApp → Paramètres → Appareils liés → Scanner
4. Scanner le QR code affiché dans les logs
5. Session sauvegardée dans `/root/courtia/whatsapp-session/`
6. Redéploiements suivants : pas besoin de rescanner

---

### VARIABLES D'ENV À CONFIGURER (Dalil)

#### Sur Render (backend)
```
# SMS (TextBelt gratuit)
SMS_PROVIDER=textbelt
TEXTBELT_API_KEY=textbelt

# WhatsApp (Baileys gratuit)
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=/root/courtia/whatsapp-session

# Email Inbound (IMAP Gmail)
IMAP_USER=arkcourtia@gmail.com
IMAP_PASSWORD=XXXX  ← Dalil génère sur myaccount.google.com

# Relances
DISABLE_RELANCES=false
```

#### Sur Vercel (frontend)
```
VITE_API_URL=https://courtia.onrender.com
```

---

### TESTS DE VALIDATION

#### Email (✅ déjà fonctionnel)
- Envoyer email test à `dalilrhasrhass@gmail.com` via l'app

#### SMS (⚠️ nécessite déploiement backend)
```bash
curl -X POST https://courtia.onrender.com/api/messaging/send \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"clientId":1, "canal":"sms", "message":"Test COURTIA"}'
```

#### WhatsApp (⚠️ nécessite QR code scanné)
Même endpoint avec `"canal":"whatsapp"`

---

### BUILD
```
npm run build → ✅ 0 erreur
Vite 1833 modules → 3.11s
```

---

### PROCHAINES ÉTAPES PRIORISÉES

1. **Stripe** — Dalil crée compte + colle clés dans Render/Vercel
2. **Email App Password** — Dalil génère sur myaccount.google.com
3. **WhatsApp QR** — Scanner après déploiement backend
4. **TextBelt** — Passer en clé payante si volume > 1 SMS/jour (ou auto-héberger Fonoster)
5. **WhatsApp Prod** — Migrer Baileys → API officielle Meta quand volume critique

---

### ROLLBACK
```bash
git reset --hard backup-before-messaging
git push --force origin main
```

---

✅ Session terminée. Tout est pushé, buildé, prêt.
