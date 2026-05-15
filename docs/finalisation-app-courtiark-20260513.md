# Finalisation app.courtiark.fr — 13 mai 2026

## Objectif
Rendre app.courtiark.fr accessible en HTTPS avec l'application COURTIA.

## État du VPS (PRÊT)

| Composant | Statut | Détail |
|-----------|--------|--------|
| Nginx config | ✅ | /etc/nginx/sites-enabled/courtia-app |
| Nginx test | ✅ | syntax ok |
| Nginx reload | ✅ | systemctl reload |
| courtia-frontend | ✅ | PM2 ID 41, :4173, online |
| pm2 save | ✅ | dump sauvegardé |

## Blocage DNS

- **Registrar :** Hostinger Operations UAB
- **DNS :** horizon.dns-parking.com, orbit.dns-parking.com
- **Problème :** Aucun accès API Hostinger sur le VPS
- **nsupdate :** REFUSED (DNS parking Hostinger n'accepte pas les mises à jour dynamiques)

### Enregistrement à créer manuellement chez Hostinger

```
Type : A
Nom  : app
Valeur: 72.62.187.63
TTL  : 300
```

URL du panel : https://hpanel.hostinger.com

## Prochaine étape (dès DNS propagé)

```bash
certbot --nginx -d app.courtiark.fr
systemctl reload nginx
curl -I https://app.courtiark.fr
curl -I https://api.courtiark.fr
```

## Règles respectées
- ✅ api.courtiark.fr non touché
- ✅ courtiark.fr racine non touché
- ✅ Femynia, Platify, Embyr, Meltbook non touchés
- ✅ Aucune suppression
- ✅ Aucun fichier sensible modifié sans backup
