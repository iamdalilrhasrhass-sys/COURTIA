# Exécution Courtia — 13 mai 2026 05:24

## Résultat : ✅ SUCCÈS

### Étape 2 — Config Nginx ✅
Fichier créé : `/etc/nginx/sites-available/courtia-app`
Symlink : `/etc/nginx/sites-enabled/courtia-app`

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

### Étape 3 — Test & Reload ✅
- `nginx -t` : syntax ok, test successful
- `systemctl reload nginx` : OK
- Test local : `curl -H "Host: app.courtiark.fr" http://127.0.0.1` → **200**

### Étape 5 — PM2 ✅
- Process : `courtia-frontend` (ID 41)
- Status : **online**, uptime 9s
- Port : 4173, curl → HTTP 200
- `pm2 save` : exécuté

### Étape 4 — Certbot
- **NON EXÉCUTÉ** — en attente de confirmation DNS
- Commande prête : `certbot --nginx -d app.courtiark.fr`

### Vérification finale
| Check | Résultat |
|-------|----------|
| nginx -t | ✅ OK |
| courtia-frontend PM2 | ✅ online (ID 41) |
| curl :4173 | ✅ 200 |
| nginx local (Host: app.courtiark.fr) | ✅ 200 |
| curl app.courtiark.fr (externe) | ❌ DNS manquant |

### Prochaine étape
Ajouter l'enregistrement DNS chez Hostinger :
```
app.courtiark.fr  A  72.62.187.63
```
Puis exécuter :
```bash
certbot --nginx -d app.courtiark.fr
```
