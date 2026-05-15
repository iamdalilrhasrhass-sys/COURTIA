# Audit COURTIA — Nginx / DNS / Frontend
**Date : 13 mai 2026**
**VPS : 72.62.187.63**

## État actuel

### Domaines & DNS

| Domaine | DNS A | Pointe vers | Statut |
|---------|-------|-------------|--------|
| courtiark.fr | 2.57.91.91 | Hostinger | Parked (page Hostinger) |
| app.courtiark.fr | **AUCUN** | — | ❌ DNS MANQUANT |
| api.courtiark.fr | 72.62.187.63 | VPS | ✅ OK |

### Services locaux

| Service | Port | PM2/Process | Statut |
|---------|------|-------------|--------|
| Backend API | 9998 | PM2 ID 26 (courtia-api) | ✅ online |
| Frontend (Vite preview) | 4173 | PID 2134681 (bg) | ✅ sert le HTML |
| Frontend build | dist/ | 13 mai 05:12 | ✅ frais |

### Nginx

| Fichier | Server Name | Proxy/Root | SSL |
|---------|-------------|------------|-----|
| courtia-api | api.courtia.fr | proxy → :9998 | ✅ LetsEncrypt |
| courtia-frontend | courtiark.fr | root dist/ | ❌ sert le VPS mais DNS → Hostinger |
| **app.courtiark.fr** | **AUCUN** | — | ❌ FICHIER MANQUANT |

### Certificats SSL

| Domaine | Expire |
|---------|--------|
| api.courtiark.fr | 30 juillet 2026 |
| feminya.xyz | 10 août 2026 |
| embir.xyz | 10 août 2026 |
| courtiark.fr | ❌ pas de cert (DNS Hostinger) |
| app.courtiark.fr | ❌ pas de cert |

## Problème racine

1. **app.courtiark.fr n'a pas de DNS** → aucun trafic n'arrive au VPS
2. **Aucune config nginx pour app.courtiark.fr** → même avec le DNS, rien ne servirait
3. **courtiark.fr est chez Hostinger** → la page Hostinger s'affiche, pas le landing Courtia

## Plan de correction

### Étape 1 : DNS
```
app.courtiark.fr  A  72.62.187.63
```
Ajouter chez le registrar (Hostinger).

### Étape 2 : Nginx
Créer `/etc/nginx/sites-available/courtia-app` :
```nginx
server {
    listen 80;
    server_name app.courtiark.fr;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activer : `ln -s /etc/nginx/sites-available/courtia-app /etc/nginx/sites-enabled/`

### Étape 3 : SSL
```bash
certbot --nginx -d app.courtiark.fr
```

### Étape 4 : PM2 (stabiliser le frontend)
Remplacer le processus background par un vrai process PM2 :
```bash
pm2 start npx --name courtia-frontend --cwd /root/courtia/frontend -- vite preview --port 4173 --host 0.0.0.0
pm2 save
```

### Étape 5 (optionnel) : Landing sur courtiark.fr
Repointre courtiark.fr → 72.62.187.63 (supprimer le parking Hostinger) pour servir le vrai landing.

## Vérification finale
```bash
curl -I https://app.courtiark.fr   # doit retourner 200
curl -I https://api.courtiark.fr   # doit retourner 200
```
