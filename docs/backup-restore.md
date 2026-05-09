# Backup & Restore COURTIA

## Dump PostgreSQL

```bash
pg_dump "$DATABASE_URL" --format=custom --file courtia-$(date +%F).dump
```

## Restore test

```bash
createdb courtia_restore_test
pg_restore --dbname courtia_restore_test --clean --if-exists courtia-YYYY-MM-DD.dump
```

## Verification apres restore

```bash
psql "$RESTORE_DATABASE_URL" -c "select current_database();"
psql "$RESTORE_DATABASE_URL" -c "select count(*) from users;"
```

## Secrets

En cas de rotation:

1. Mettre a jour les variables backend.
2. Redemarrer uniquement avec `pm2 restart courtia-api --update-env`.
3. Verifier `/api/status`.
4. Lancer le smoke prod.

`pm2 reload` est interdit pour les changements d'environnement.
