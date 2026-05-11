# Liste des Captures Vidéo — COURTIA

**Dossier :** `/tmp/courtia-captures/`  
**Date :** 11 mai 2026  
**Total :** 23 captures automatiques + 5 à capturer manuellement

---

## Captures disponibles (automatiques)

### Desktop

| # | Fichier | Page | Taille | Prêt vidéo |
|---|---------|------|--------|------------|
| 01 | `01_landing_hero_desktop.png` | Landing Hero | 462K | ✅ |
| 02 | `02_tarifs_public_desktop.png` | Tarifs publics | 794K | ✅ |
| 03 | `03_demo_public_desktop.png` | Page Démo | 647K | ✅ |
| 04 | `04_contact_desktop.png` | Contact | 547K | ✅ |
| 05 | `05_securite_desktop.png` | Sécurité | 663K | ✅ |
| 06 | `06_rgpd_desktop.png` | RGPD | 724K | ✅ |
| 07 | `07_dashboard_desktop.png` | Dashboard cockpit | 2.9M | ✅ |
| 08 | `08_clients_desktop.png` | Clients bulles | 3.5M | ✅ |
| 09 | `09_contrats_desktop.png` | Contrats | 16M | ✅ |
| 10 | `10_devis_desktop.png` | Devis | 534K | ✅ |
| 11 | `11_rapports_desktop.png` | Rapports | 2.9M | ✅ |
| 12 | `12_abonnement_desktop.png` | Abonnement | 2.7M | ✅ |
| 13 | `13_morningbrief_desktop.png` | Morning Brief ARK | 1.6M | ✅ |
| 14 | `14_ark_assistant_desktop.png` | Assistant ARK | 519K | ✅ |
| 15 | `15_taches_desktop.png` | Tâches | 3.6M | ✅ |

### Mobile

| # | Fichier | Page | Taille | Prêt vidéo |
|---|---------|------|--------|------------|
| M1 | `01_landing_hero_mobile.png` | Landing mobile | 495K | ✅ |
| M2 | `02_tarifs_public_mobile.png` | Tarifs mobile | 449K | ✅ |
| M3 | `03_demo_public_mobile.png` | Démo mobile | 366K | ✅ |
| M4 | `04_contact_mobile.png` | Contact mobile | 290K | ✅ |
| M5 | `05_securite_mobile.png` | Sécurité mobile | 379K | ✅ |
| M6 | `06_rgpd_mobile.png` | RGPD mobile | 372K | ✅ |

### Tablette

| # | Fichier | Page | Taille | Prêt vidéo |
|---|---------|------|--------|------------|
| T1 | `01_landing_hero_tablet.png` | Landing tablette | 492K | ✅ |
| T2 | `02_tarifs_public_tablet.png` | Tarifs tablette | 618K | ✅ |

---

## Captures manquantes (⚠️ À CAPTURER MANUELLEMENT)

Ces pages nécessitent une authentification Google OAuth. À capturer après connexion manuelle.

| # | Fichier à créer | Page | Importance | Impact si absent |
|---|----------------|------|------------|------------------|
| 16 | `16_fiche_client_desktop.png` | Fiche client augmentée | 🔴 Critique | Perte de l'argument "ARK analyse chaque client" |
| 17 | `17_relances_desktop.png` | Relances prioritaires | 🔴 Critique | Perte de l'argument "ARK dit qui appeler" |
| 18 | `18_opportunites_desktop.png` | Opportunités commerciales | 🔴 Critique | Perte de l'argument "ARK détecte le CA caché" |
| 19 | `19_documents_desktop.png` | Documents centralisés | 🟡 Important | Page secondaire mais utile |
| 20 | `20_sidebar_ouverte_desktop.png` | Sidebar accordéon ouverte | 🟡 Important | Montre l'étendue du produit |
| 21 | `21_fiche_client_mobile.png` | Fiche client mobile | 🟢 Bonus | Version mobile |
| 22 | `22_morning_brief_mobile.png` | Morning Brief mobile | 🟢 Bonus | Version mobile |
| 23 | `23_clients_bulles_mobile.png` | Clients bulles mobile | 🟢 Bonus | Version mobile |

---

## Procédure de capture manuelle

1. Ouvrir Chrome et se connecter sur `https://app.courtiark.fr` via Google OAuth
2. Naviguer vers chaque page listée ci-dessus
3. Capturer en plein écran (Cmd+Shift+4 sur Mac, ou outil capture)
4. Résolution recommandée : 1440×900 ou 1920×1080
5. Enregistrer dans `/tmp/courtia-captures/` avec le nom indiqué

**Alternative si le site n'est pas déployé :**
1. `cd /root/courtia/frontend && npx vite preview --port 4173`
2. Ouvrir `http://localhost:4173` dans Chrome
3. Se connecter via Google OAuth
4. Capturer les pages

---

## Pages à éviter dans la vidéo

- ❌ Login page (pas de sens commercial)
- ❌ Page `/capitia` (module IOBSP hors scope)
- ❌ Page `/admin` (back-office, pas public)
- ❌ Pages avec scrollbar visible
- ❌ Pages avec le footer trop présent
