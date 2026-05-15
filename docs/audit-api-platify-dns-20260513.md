# Audit api.platify.app — 13 mai 2026

## Diagnostic

| Composant | Statut | Détail |
|-----------|--------|--------|
| **Nginx config** | ✅ Prêt | /etc/nginx/sites-enabled/api.platify.app |
| **Nginx test** | ✅ OK | syntax ok, test successful |
| **Proxy :3003** | ✅ Actif | proxy_pass http://localhost:3003 |
| **API :3003** | ✅ OK | /api/health répond |
| **Nginx proxy test** | ✅ OK | curl -H "Host: api.platify.app" 127.0.0.1 → 200 |
| **DNS @8.8.8.8** | ❌ | Aucun enregistrement |
| **DNS @1.1.1.1** | ❌ | Aucun enregistrement |
| **SSL** | ⏳ | En attente DNS |

## Config Nginx (déjà active)

```nginx
server {
    listen 80;
    server_name api.platify.app;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## DNS — Action requise

platify.app est géré par **Cloudflare** (NS: elsa.ns.cloudflare.com, kyree.ns.cloudflare.com).

Enregistrement à créer dans le dashboard Cloudflare :

```
Type  : A
Nom   : api
Valeur: 72.62.187.63
TTL   : Auto
Proxy : Désactivé (DNS only — icône grise, pas orange)
```

⚠️ Important : désactiver le proxy Cloudflare (icône grise) pour que Certbot puisse faire la validation HTTP.

## Après propagation DNS

```bash
certbot --nginx -d api.platify.app
curl -I https://api.platify.app/api/health
```

## Checklist post-DNS

- [ ] dig api.platify.app A → 72.62.187.63
- [ ] curl http://api.platify.app/api/health → 200
- [ ] certbot --nginx -d api.platify.app
- [ ] curl https://api.platify.app/api/health → 200
