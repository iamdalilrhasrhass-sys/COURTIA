# COURTIA — Render Deploy Fix (Clôture Infra)

Date : 2 mai 2026

## 1) Constat final
Service Render ciblé : `srv-d7561hsr85hc73a9c6i0`.

État confirmé dans Render Dashboard :
- base `courtia-db` en `suspended`,
- plan `free` expiré,
- suspension liée au billing (`expiresAt 2026-04-29`).

Conséquence technique :
- `https://courtia.onrender.com/api/health` peut répondre `200`,
- mais les endpoints DB (`/api/auth/register`) échouent avec `getaddrinfo ENOTFOUND`,
- ce n'est pas un bug code produit bloquant la prod officielle.

## 2) Décision infra actée
- Render est classé **non-prod / secondaire**.
- Aucun paiement Render effectué.
- Aucune recréation de DB Render.
- Aucune migration prod vers Render.
- Aucune dépendance runtime prod à `courtia.onrender.com`.

Backend production officiel :
- `https://api.courtiark.fr`

Frontend production officiel :
- `https://courtia.vercel.app`

## 3) Vérifications officielles
- `curl -i https://api.courtiark.fr/api/health` -> `HTTP 200`.
- `curl -I https://courtia.vercel.app` -> `HTTP/2 200`.
- Les références `courtia.onrender.com` dans le frontend runtime sont absentes ; Render n'est pas utilisé comme backend officiel.

## 4) Statut P0 Render
- P0 Render **clôturé par décision infra** (service non-prod).
- Ce P0 n'est pas fermé par réactivation de la DB Render ; il est fermé car la production officielle repose sur VPS/PM2.

## 5) À conserver pour plus tard (hors prod actuelle)
- Nettoyage éventuel du service Render.
- Soit suppression du service non utilisé, soit réactivation DB sur plan payant dans une mission dédiée.
