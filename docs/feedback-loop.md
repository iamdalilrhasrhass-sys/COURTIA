# Feedback Loop

Les utilisateurs connectes peuvent envoyer un retour depuis le bouton flottant `Feedback`.

## Types

- `bug`
- `idea`
- `friction`
- `praise`

## Backend

- `POST /api/feedback`
- `GET /api/admin/feedback`
- `PATCH /api/admin/feedback/:id`

Champs stockes:

- `user_id`
- `type`
- `page`
- `message`
- `metadata`
- `status`
- `created_at`

## Admin

Les super admins consultent `/admin/feedback` et passent les retours de `new` a `seen` ou `resolved`.
