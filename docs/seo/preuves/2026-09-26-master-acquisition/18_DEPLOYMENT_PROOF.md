# Production apres travaux — master acquisition (26/09/2026)

## Deploiement

| Element | Valeur |
|---|---|
| Dernier deploiement de production | `courtia-8xcceu9i9-iamdalilrhasrhass-1376s-projects.vercel.app` — Ready, Production, 43 s |
| Alias | `courtiark.fr` |
| Identifiant servi (en-tete `x-vercel-id`) | `lhr1::hc9mp-1790431581436-4d07441765d4` |
| Commit courant | voir `git log -1` (dernier commit de la phase) |

## Controles sur la production reellement servie

| Controle | Mesure | Verdict |
|---|---|---|
| Gate production | 85 URL testees, 0 en echec | PASS |
| Redirections | 178 testees, 178 conformes, 0 chaine, 0 destination morte | PASS |
| Sitemaps | 10 fichiers, 85 URL, XML valide, index a 10 enfants | PASS |
| Money page | 200, titre « Logiciel pour courtier en assurance | CRM IA COURTIARK » | PASS |
| Captures produit servies | 7 fichiers WebP, 392 Ko au total | PASS |
| CTA « Voir COURTIARK en action » | present sur 85 pages, cible `/demo/dashboard` | PASS |
| Demonstration interactive | reste dans `/demo` apres navigation (defaut corrige) | PASS |
| Formulaire de demonstration | envoi reel, message de succes affiche, demande enregistree | PASS |
| Attribution | `session_id`, premier et dernier contact enregistres sur la demande | PASS |
| Evenements | 20 evenements distincts recus en base | PASS |
| Performance | 100/100/100/100 sur les 5 pages testees (`16_LIGHTHOUSE.md`) | PASS |

## Verification par le contenu (pas par le statut)

Le deploiement a ete valide en lisant le contenu reellement servi : presence des captures
`/img/produit/courtiark-*.webp`, presence du CTA vers `/demo/dashboard`, presence du garde-fou
d'instrumentation dans `/js/mesure.js`, et reponse du formulaire avec enregistrement en base.
Le statut « Ready » de Vercel n'a jamais servi de preuve.
