# COURTIA Marketing Videos

Pipeline vidéo marketing pour assets COURTIA.

## Structure

- `storyboards/` : scripts narratifs par vidéo
- `scripts/capture-app-screenshots.js` : capture des écrans app
- `scripts/capture-landing-screenshots.js` : captures landing desktop/mobile
- `scripts/generate-courtia-tiktok.js` : génération TikTok/Reels 9:16
- `scripts/generate-courtia-orchestral-bubbles.js` : génération version rythmée
- `assets/screenshots/` : captures utilisées dans les montages
- `assets/audio/` : audio libre de droits (à fournir)
- `exports/` : vidéos rendues

## Pré-requis

- Node.js 20+
- `ffmpeg` installé localement pour génération MP4
- accès à une URL COURTIA (prod ou preview)

## 1) Capturer les écrans de l'app

```bash
node marketing/videos/scripts/capture-app-screenshots.js
node marketing/videos/scripts/capture-landing-screenshots.js
```

Variables optionnelles:

- `PROD_URL` (default: `https://courtia.vercel.app`)
- `E2E_EMAIL`, `E2E_PASSWORD`
- `DALIL_EMAIL`, `DALIL_PASSWORD`

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
- Placez un audio libre de droits dans:
- `marketing/videos/assets/audio/tiktok-bed.mp3`
- `marketing/videos/assets/audio/orchestral-bed.mp3`

Les scripts fonctionnent sans audio (version silencieuse).

Si votre build `ffmpeg` ne supporte pas le filtre `subtitles`, les MP4 sont générées sans sous-titres incrustés (`captionsBurned: false`).
