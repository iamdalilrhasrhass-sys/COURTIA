# COURTIA Marketing Videos

Pipeline vidéo marketing pour assets COURTIA.

## Structure

- `storyboards/` : scripts narratifs par vidéo
- `scripts/capture-app-screenshots.js` : capture des écrans app
- `scripts/capture-landing-screenshots.js` : captures landing desktop/mobile
- `scripts/generate-courtia-tiktok.js` : génération TikTok/Reels 9:16
- `scripts/generate-courtia-orchestral-bubbles.js` : génération version rythmée
- `assets/screenshots/` : captures utilisées dans les montages
- `assets/audio/` : audio libre/placeholders (WAV)
- `exports/` : vidéos rendues

## Pré-requis

- Node.js 20+
- `ffmpeg` installé localement pour génération MP4
- accès à une URL COURTIA (prod ou preview)

## 1) Capturer les écrans de l'app

```bash
COURTIA_URL=https://courtia.vercel.app node marketing/videos/scripts/capture-app-screenshots.js
node marketing/videos/scripts/capture-landing-screenshots.js
```

Variables optionnelles:

- `COURTIA_URL` (prioritaire), puis `PREVIEW_URL`/`PROD_URL`
- `E2E_EMAIL`, `E2E_PASSWORD` (fallbacks intégrés: `Password123!`, `courtia2026`, `TestE2E2026!`)
- `DALIL_EMAIL`, `DALIL_PASSWORD`

Captures générées:

- desktop: `*-desktop.png` (1440x1000)
- mobile: `*-mobile.png` (390x844)
- vertical: `*-vertical.png` (1080x1920)
- alias canonical: `*.png` (copie du vertical, utilisée par les générateurs vidéo)

## 2) Générer les vidéos

```bash
node marketing/videos/scripts/generate-courtia-tiktok.js
node marketing/videos/scripts/generate-courtia-orchestral-bubbles.js
```

Sorties attendues:

- `marketing/videos/exports/courtia-tiktok-presentation.mp4`
- `marketing/videos/exports/courtia-orchestral-bubbles.mp4`

## Audio

- Ne pas utiliser de musique sous copyright non licencié.
- Placeholders attendus:
- `marketing/videos/assets/audio/drum-hit.wav`
- `marketing/videos/assets/audio/bubble-pop.wav`
- `marketing/videos/assets/audio/orchestral-bed.wav`
- `marketing/videos/assets/audio/soft-whoosh.wav`
- Les scripts vidéo utilisent automatiquement l'audio disponible le plus pertinent.

Les scripts fonctionnent sans audio (version silencieuse).

Si votre build `ffmpeg` ne supporte pas le filtre `subtitles`, les MP4 sont générées sans sous-titres incrustés (`captionsBurned: false`).

## 3) Vérifier format final

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=nw=1 marketing/videos/exports/courtia-tiktok-presentation.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=nw=1 marketing/videos/exports/courtia-orchestral-bubbles.mp4
```

Checklist:

- 1080x1920
- 25-45s
- lisible mobile
- pas d'écran blanc
- textes cohérents COURTIA (ARK, clients à risque, fiche 360, intégrations, Morning Brief)
