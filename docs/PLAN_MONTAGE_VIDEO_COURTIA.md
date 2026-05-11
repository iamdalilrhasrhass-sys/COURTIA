# Plan de Montage Vidéo COURTIA

**Version :** Finale  
**Formats :** 45s (principale), 15s (réseaux), 90s (démo)  
**Logiciels cibles :** CapCut, Premiere Pro, DaVinci Resolve, Runway  
**Date :** 11 mai 2026

---

## 1. Captures utilisées

Toutes les captures sont dans `/tmp/courtia-captures/`.

| # | Fichier | Page | Statut |
|---|---------|------|--------|
| 01 | `01_landing_hero_desktop.png` | Landing Hero | ✅ |
| 02 | `02_tarifs_public_desktop.png` | Tarifs publics | ✅ |
| 07 | `07_dashboard_desktop.png` | Dashboard cockpit | ✅ |
| 08 | `08_clients_desktop.png` | Clients bulles | ✅ |
| 09 | `09_contrats_desktop.png` | Contrats | ✅ |
| 10 | `10_devis_desktop.png` | Devis | ✅ |
| 11 | `11_rapports_desktop.png` | Rapports | ✅ |
| 13 | `13_morningbrief_desktop.png` | Morning Brief ARK | ✅ |
| 15 | `15_taches_desktop.png` | Tâches | ✅ |
| — | `16_fiche_client_desktop.png` | Fiche client | ❌ À capturer |
| — | `17_relances_desktop.png` | Relances | ❌ À capturer |
| — | `18_opportunites_desktop.png` | Opportunités | ❌ À capturer |
| — | `19_documents_desktop.png` | Documents | ❌ À capturer |
| — | `20_sidebar_ouverte_desktop.png` | Sidebar ouverte | ❌ À capturer |

---

## 2. Plan de montage 45 secondes

| Plan | Durée | Capture | Mouvement | Transition | Texte écran |
|------|-------|---------|-----------|------------|-------------|
| 1 | 0-5s | `01_landing_hero_desktop.png` | Zoom lent avant (scale 1.0→1.08) | Fondu noir entrant | "Trop de clients. Trop d'échéances. Trop de relances." |
| 2 | 5-10s | `07_dashboard_desktop.png` | Slide gauche→droite, zoom KPIs | Fondu croisé 0.5s | "Centralisez votre cabinet." |
| 3 | 10-16s | `07_dashboard_desktop.png` | Zoom lent sur score 72/100 | Cut | "Visualisez la santé de votre portefeuille." |
| 4 | 16-22s | `08_clients_desktop.png` + `16_fiche_client_desktop.png` | Split screen → zoom fiche | Slide horizontal | "Clients à risque et opportunités" |
| 5 | 22-28s | `09_contrats_desktop.png` → `10_devis_desktop.png` → `19_documents_desktop.png` | Enchaînement rapide 3 plans | Cut x3 (0.3s each) | "Contrats, devis, documents" |
| 6 | 28-36s | `13_morningbrief_desktop.png` | Zoom lent sur carte ARK | Fondu Aurora 0.8s | "ARK priorise vos actions" |
| 7 | 36-42s | `17_relances_desktop.png` → `18_opportunites_desktop.png` | Split vertical (relances haut, opportunités bas) | Slide vertical | "Relancez mieux. Vendez plus intelligemment." |
| 8 | 42-45s | `01_landing_hero_desktop.png` (CTA) | Zoom arrière lent | Fondu violet | "COURTIA — Le cockpit intelligent des courtiers en assurance." |

---

## 3. Effets recommandés

| Effet | Où | Comment |
|-------|----|--------|
| Zoom lent | Tous les plans | Scale 100%→108% sur 4-5s |
| Fondu Aurora | Transitions clés | Overlay violet/cyan à 8% opacité |
| Glow subtil | Zones ARK | Masque de surbrillance #8B5CF6 à 15% |
| Slide horizontal | Split screen | Décalage -20px → 0 sur 0.5s |
| Parallax léger | Dashboard | Fond -2px, KPIs +2px |
| Flou directionnel | Transitions rapides | Gaussian blur 3px pendant 0.2s |

---

## 4. Musique

**Style :** Électronique premium, tempo modéré (90-100 BPM)  
**Ambiance :** Corporate moderne, futuriste sobre  
**Références :** Artlist — "Digital Horizon", Epidemic Sound — "Future Blueprint"  
**Mots-clés :** corporate premium, futuristic calm, tech minimal, luxury software, smooth digital pulse  
**Structure :** Intro sobre → montée progressive → pic énergie plan 6 (ARK) → descente douce vers final

---

## 5. Exports recommandés

| Version | Résolution | Format | Codec | Bitrate | Usage |
|---------|-----------|--------|-------|---------|-------|
| 45s | 1920×1080 | MP4 | H.264 | 12-15 Mbps | Site, YouTube, LinkedIn |
| 15s | 1080×1920 | MP4 | H.264 | 8-10 Mbps | Reels, Shorts, TikTok |
| 90s | 1920×1080 | MP4 | H.264 | 12-15 Mbps | Démo commerciale, email |

---

## 6. Instructions par logiciel

### CapCut (recommandé pour simplicité)
1. Importer les captures dans l'ordre
2. Appliquer zoom lent automatique (Ken Burns)
3. Ajouter textes en Inter Bold, blanc, avec ombre légère
4. Transitions : "Fondu" 0.5s entre chaque plan
5. Ajouter musique (bibliothèque CapCut → "Corporate Tech")
6. Ajuster timing selon storyboard
7. Exporter 1920×1080 30fps

### Premiere Pro / DaVinci Resolve
1. Sequence 1920×1080, 30fps
2. Nest les captures dans l'ordre
3. Keyframes scale 100→108 sur chaque plan
4. Adjustment layer avec glow #8B5CF6 pour plans ARK
5. Audio ducking pour voix off (-12dB sous voix)
6. Export H.264, VBR 2 pass, 15 Mbps cible

### Runway (IA générative)
Voir `/docs/PROMPTS_VIDEO_IA_COURTIA.md`

---

## 7. Check-list avant export

- [ ] Toutes les captures sont en 1920×1080 ou recadrées
- [ ] Aucune capture ne montre de login / page vide
- [ ] Les textes overlay sont en français
- [ ] La voix off est synchrone avec les plans
- [ ] La musique ne couvre pas la voix
- [ ] Les transitions sont fluides
- [ ] Le logo COURTIA est visible au dernier plan
- [ ] Le CTA "courtiark.fr" est visible
- [ ] Pas de "Capitia", pas d'anglais, pas d'anciens prix
