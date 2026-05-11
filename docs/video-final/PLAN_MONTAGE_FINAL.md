# Plan de Montage Final — COURTIA

**Logiciels :** CapCut, Premiere Pro, DaVinci Resolve  
**Format :** 1920×1080, 30fps, MP4 H.264  
**Date :** 11 mai 2026

---

## 1. Captures (dossier `/docs/captures-video-finales/`)

| # | Fichier | Page | Utilisé dans |
|---|---------|------|-------------|
| 01 | `01_landing_hero_desktop.png` | Landing Hero | Plan 1, Plan 8 |
| 02 | `02_landing_ark_desktop.png` | Section ARK landing | Option |
| 03 | `03_landing_tarifs_desktop.png` | Tarifs landing | Plan 90s |
| 04 | `04_dashboard_cockpit_desktop.png` | Dashboard | Plan 2 |
| 05 | `05_dashboard_kpis_desktop.png` | Dashboard KPIs | Plan 3 |
| 06 | `06_morning_brief_desktop.png` | Morning Brief | Plan 6 |
| 07 | `07_clients_bulles_desktop.png` | Clients | Plan 4 |
| 09 | `09_fiche_client_desktop.png` | Fiche client | Plan 4 |
| 10 | `10_contrats_desktop.png` | Contrats | Plan 5 |
| 11 | `11_devis_desktop.png` | Devis | Plan 5 |
| 12 | `12_documents_desktop.png` | Documents | Plan 5 |
| 15 | `15_relances_desktop.png` | Relances | Plan 7 |
| 16 | `16_opportunites_desktop.png` | Opportunités | Plan 7 |
| 17 | `17_sidebar_ouverte_desktop.png` | Sidebar | Option 90s |

---

## 2. Timeline 45s

| Plan | In | Out | Durée | Capture | Effet |
|------|-----|-----|-------|---------|-------|
| 1 | 00:00 | 00:05 | 5s | `01` | Zoom 100→108%, fondu noir entrant |
| 2 | 00:05 | 00:10 | 5s | `04` | Slide gauche-droite, fondu croisé 0.5s |
| 3 | 00:10 | 00:16 | 6s | `05` | Zoom KPIs, cut |
| 4 | 00:16 | 00:22 | 6s | `07` + `09` | Split horizontal, slide |
| 5 | 00:22 | 00:28 | 6s | `10` → `11` → `12` | 3 cuts rapides 0.3s |
| 6 | 00:28 | 00:36 | 8s | `06` | Zoom ARK, glow #8B5CF6, fondu Aurora 0.8s |
| 7 | 00:36 | 00:42 | 6s | `15` + `16` | Split vertical, slide |
| 8 | 00:42 | 00:45 | 3s | `01` | Zoom arrière, fondu violet noir |

---

## 3. Effets recommandés

| Effet | Paramètres | Où |
|-------|-----------|----|
| Zoom lent | Scale 100→108%, easing ease-out | Tous les plans |
| Fondu Aurora | Overlay #8B5CF6 à 8% opacité, 0.8s | Plan 6, Plan 8 |
| Glow ARK | Masque #8B5CF6 à 15%, pulse 2s | Plan 6 |
| Slide horizontal | Décalage -30px→0, 0.5s | Plan 4 |
| Fondu croisé | Opacité 0→100, 0.5s | Entre tous les plans |
| Texte overlay | Inter Bold, blanc, ombre rgba(0,0,0,0.5), 8px blur | Tous les plans |

---

## 4. Musique

- Style : Électronique premium, corporate
- Tempo : 90-100 BPM
- Structure : Intro sobre (0-15s) → Montée (15-30s) → Pic (30-40s) → Descente (40-45s)
- Audio ducking : -12dB sous la voix off

---

## 5. Voix off

- Langue : Français
- Voix recommandée : ElevenLabs — voix masculine française, ton sérieux et confiant
- Rythme : ~2.1 mots/seconde (~95 mots en 45s)

---

## 6. Exports

| Version | Résolution | Format | Usage |
|---------|-----------|--------|-------|
| 45s | 1920×1080 | MP4 H.264, 15 Mbps | Site, LinkedIn, YouTube |
| 15s | 1080×1920 | MP4 H.264, 10 Mbps | Reels, Shorts, TikTok |
| 90s | 1920×1080 | MP4 H.264, 15 Mbps | Démo commerciale |

---

## 7. Instructions CapCut

1. Importer les 9 captures dans l'ordre de la timeline
2. Appliquer zoom lent (Ken Burns) sur chaque clip
3. Ajouter textes en Inter Bold, blanc avec ombre
4. Transitions : Fondu 0.5s entre chaque plan
5. Plan 5 : 3 images successives de 1.5s, transition Cut
6. Musique : bibliothèque CapCut → "Corporate Tech"
7. Voix off : importer audio ElevenLabs, synchroniser
8. Export 1920×1080, 30fps, qualité maximale
