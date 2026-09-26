#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Notation des prospects d'autorite (44 domaines) et preparation de l'outreach.

Regle : aucun indicateur d'autorite (DR/DA/trafic) n'est invente. On note uniquement ce qui
est verifiable : la nature de l'acteur, le marche, le canal, l'accessibilite (un e-mail
professionnel public a-t-il ete trouve dans une page publiee par le site lui-meme) et la
possibilite d'apporter un contenu. Les contacts sont reels et publics ; aucune campagne
n'est envoyee.

Produit :
  - backend/src/db/migrations/128 (appliquee)
  - notation des 44 domaines dans backlink_prospects
  - table seo_partnership_prospects
  - docs/seo/BACKLINKS_TOP10.md
  - docs/seo/OUTREACH_DRAFTS.md
"""
import io, os, subprocess, datetime

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET = '/root/.hermes/secrets/render_database_url'

# Nature de l'acteur -> (pertinence courtage assurance 0-3, canal 0-2, apport de contenu possible 0-2)
NATURE = {
    'média spécialisé courtage': (3, 2, 2),
    'média/annuaire courtage': (3, 2, 2),
    'média digitalisation assurance': (3, 2, 2),
    'média professionnel assurance': (3, 2, 2),
    'média courtage suisse': (3, 2, 2),
    'association suisse de courtiers': (3, 2, 1),
    'association professionnelle': (3, 2, 1),
    'association professionnelle suisse': (3, 2, 1),
    'organisme professionnel': (3, 2, 1),
    'organisme de formation': (3, 2, 2),
    'formation courtage': (3, 2, 2),
    'formation réglementaire': (3, 2, 1),
    'formation finance/assurance': (3, 2, 1),
    'annuaire/formation': (2, 2, 1),
    'média/événement courtage': (3, 2, 2),
    'consultant courtage': (2, 1, 2),
    'consultant assurance': (2, 1, 2),
    'consultant': (1, 1, 1),
    'courtier grossiste': (2, 0, 0),
    'acteur assurance (courtage)': (2, 0, 0),
    'acteur suisse du courtage': (2, 0, 0),
    'acteur suisse (automatisation)': (2, 1, 1),
    'acteur assurance suisse': (1, 0, 0),
    'acteur assurance construction': (1, 0, 0),
    'acteur transactions': (0, 0, 0),
    'podcast courtage': (2, 1, 1),
    'podcast assurance': (2, 1, 1),
    'initiative courtier': (2, 1, 1),
    'plateforme de podcast': (1, 0, 0),
    'plateforme': (0, 0, 0),
    'réseau social': (0, 0, 0),
    'autorité de surveillance': (1, 1, 0),
    'fédération professionnelle': (3, 1, 0),
    'base de données publique': (1, 0, 0),
    'agence de presse régionale': (1, 1, 1),
    'média généraliste suisse': (1, 0, 0),
    'à qualifier': (0, 0, 0),
}

PAYS = {'FR': 2, 'CH': 2}

# Contacts reellement verifies dans une page publique du site (page contact, mentions legales
# ou page d'accueil). Un champ vide signifie : aucun e-mail public trouve -> formulaire.
CONTACTS = {
    'courtage-magazine.fr': ('Laurent Lemonnier (gérant, iSoluce SARL)', 'bienvenue@isoluce.net',
                             'e-mail public (mentions légales)'),
    'digital-et-assurance.com': ('Alexandre Pengloan (éditeur)', 'alexandre.pengloan@gmail.com',
                                 'e-mail public (site)'),
    'aca-courtiers.ch': ('Secrétariat ACA (Melissa Maillard)', 'secretariat@aca-courtiers.ch',
                         'e-mail public (site)'),
    'orica.fr': ('Orica — organisme de formation', 'contact@orica.fr', 'e-mail public (site)'),
    'swiss-courtage.ch': ('Swiss Courtage', 'info@swiss-courtage.ch', 'e-mail public (site)'),
    'romandiecourtage.ch': ('Romandie Courtage', 'info@romandiecourtage.ch', 'e-mail public (site)'),
}

TOP5 = [
    dict(rang=1, domaine='courtage-magazine.fr', canal='guest post / article invité',
         raison="Le média publie déjà des checklists opérationnelles pour cabinets de courtage "
                "(« Migration CRM courtier : la checklist de reprise des dossiers », « Fidélisation en assurance : "
                "9 actions concrètes pour un cabinet de courtage ») et dispose d'une rubrique « Gestion & Relation client ».",
         actif='Guide « 25 points pour organiser un cabinet de courtage » + checklist de reprise de données',
         complementarite='Média spécialisé courtage en France ; audience de cabinets et de courtiers indépendants'),
    dict(rang=2, domaine='digital-et-assurance.com', canal='interview / analyse invitée',
         raison="Le média couvre la digitalisation de l'assurance et publie des interviews de dirigeants d'acteurs "
                "assurtech (ex. interviews Linkio, dossiers IA et legacy). Un éditeur identifié signe les contenus.",
         actif="Retour d'expérience : ce qu'un cabinet de courtage mesure réellement avant et après automatisation",
         complementarite="Média digitalisation assurance France ; audience assureurs et courtiers"),
    dict(rang=3, domaine='aca-courtiers.ch', canal='partenariat association (service aux membres)',
         raison="Association suisse de courtiers en assurances : elle publie une veille documentaire et un guide de "
                "collaboration en prévoyance, organise le Forum des Courtiers et référence les avantages membres.",
         actif='Accès outil pour les membres : calculateur de charge administrative et checklist de renouvellement',
         complementarite="Association professionnelle suisse romande ; accès direct à des cabinets membres"),
    dict(rang=4, domaine='orica.fr', canal='partenariat formation',
         raison="Organisme de formation courtage : ses parcours couvrent la conformité et l'organisation du cabinet ; "
                "un support de travail utilisable en formation complète les modules.",
         actif='Checklists dossier et renouvellement (utilisables en formation, sans formulaire)',
         complementarite="Formation réglementaire France ; futurs professionnels et cabinets en montée en charge"),
    dict(rang=5, domaine='ascourtage.fr', canal='annuaire / publication métier',
         raison="Média et annuaire du courtage : la fiche annuaire et les contenus pratiques visent la même audience "
                "de courtiers. Aucun e-mail public trouvé sur le site à ce stade.",
         actif='Outil gratuit : calculateur de taux de transformation',
         complementarite="Média et annuaire courtage France ; visibilité sur les requêtes métier"),
]

PARTENARIATS = [
    ('ACA — Association des Courtiers en Assurances', 'organisme professionnel', 'Schweiz'),
]


def psql(sql=None, fichier=None, lot=None):
    """Une seule connexion : les mises a jour sont regroupees dans un fichier SQL."""
    db = io.open(SECRET, encoding='utf-8').read().strip()
    args = ['psql', db, '-A', '-t', '-v', 'ON_ERROR_STOP=1']
    if lot:
        chemin = '/tmp/ark_backlinks_batch.sql'
        io.open(chemin, 'w', encoding='utf-8').write('\n'.join(lot) + '\nBEGIN;\n' + '\n'.join(lot[1:]) + '\nCOMMIT;\n'
                                                     if False else '\n'.join(lot) + '\n')
        args += ['--single-transaction', '-f', chemin]
    elif fichier:
        args += ['-f', fichier]
    else:
        args += ['-c', sql]
    r = subprocess.run(args, capture_output=True, text=True, timeout=300)
    return r.stdout.strip(), r.stderr.strip()


def main():
    migr = os.path.join(RACINE, 'backend', 'src', 'db', 'migrations',
                        '128_autorite_courtiark_score_et_partenariats.sql')
    out, err = psql(None, fichier=migr)
    print('migration 128 :', 'OK' if not err else 'ERREUR ' + err[:200])

    sortie, err = psql("select domaine, coalesce(type,''), coalesce(pays,'') from backlink_prospects")
    if err:
        print('lecture impossible :', err[:200])
        return 1
    lignes = [l.split('|') for l in sortie.splitlines() if l.strip()]
    notes, lot = [], []
    for ligne in lignes:
        domaine, nature, pays = (list(ligne) + ['', ''])[:3]
        p, canal, apport = NATURE.get(nature.strip(), (0, 0, 0))
        marche = PAYS.get(pays.strip(), 0)
        contact = CONTACTS.get(domaine)
        acces = 2 if contact else 0
        score = p + marche + canal + acces + apport
        notes.append((score, domaine, nature, pays, contact))
        nom = contact[0] if contact else None
        mail = contact[1] if contact else None
        canal_contact = contact[2] if contact else 'non vérifié (aucun e-mail public trouvé)'
        lot.append("update backlink_prospects set score=%d, canal=%s, contact_nom=%s, contact_email=%s, "
                   "canal_contact=%s, autorite='non mesuree' where domaine=%s;" % (
                       score, _q(canal or nature), _q(nom), _q(mail), _q(canal_contact), _q(domaine)))
    notes.sort(reverse=True)

    for item in TOP5:
        contact = CONTACTS.get(item['domaine'])
        lot.append("update backlink_prospects set rang=%d, raison_contact=%s, actif_propose=%s where domaine=%s;"
                   % (item['rang'], _q(item['raison']), _q(item['actif']), _q(item['domaine'])))
        lot.append("insert into seo_partnership_prospects (organisation, pays, type_acteur, site, contact_nom, "
                   "contact_email, canal_contact, complementarite, actif_propose, statut) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,'a_contacter') "
                   "on conflict (site) do update set complementarite=excluded.complementarite, actif_propose=excluded.actif_propose, "
                   "contact_nom=excluded.contact_nom, contact_email=excluded.contact_email;" % (
                       _q(item['domaine']), _q('France' if not str(item['domaine']).endswith('.ch') else 'Suisse'),
                       _q(item['canal']), _q(item['domaine']), _q(contact[0] if contact else None),
                       _q(contact[1] if contact else None), _q(contact[2] if contact else 'formulaire'),
                       _q(item['complementarite']), _q(item['actif'])))
    sortie, err_lot = psql(lot=lot)
    print('mises a jour base :', 'OK (%d instructions)' % len(lot) if not err_lot else 'ERREUR ' + err_lot[:300])

    texte = _rapport(notes)
    dossier = os.path.join(RACINE, 'docs', 'seo')
    io.open(os.path.join(dossier, 'BACKLINKS_TOP10.md'), 'w', encoding='utf-8').write(texte['top10'])
    io.open(os.path.join(dossier, 'OUTREACH_DRAFTS.md'), 'w', encoding='utf-8').write(texte['drafts'])
    print(texte['top10'])
    print('brouillons écrits : docs/seo/OUTREACH_DRAFTS.md')
    return 0


def _q(v):
    if v is None:
        return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"


def _rapport(notes):
    aujourdhui = datetime.date.today().isoformat()
    top10 = ['# COURTIARK — Autorité : notation des prospects et Top 10', '',
             'Établi le %s par `seo/backlinks.py`.' % aujourdhui, '',
             '## Méthode de notation (0 à 11)', '',
             '| Critère | Points | Source |',
             '|---|---|---|',
             '| Pertinence courtage / assurance | 0 à 3 | nature de l’acteur (page publique du site) |',
             '| Marché France ou Suisse | 0 à 2 | pays du site |',
             '| Canal (média, association, annuaire) | 0 à 2 | rubriques publiées |',
             '| Accessibilité (e-mail professionnel public) | 0 à 2 | page contact ou mentions légales du site |',
             '| Apport de contenu possible | 0 à 2 | contenus tiers déjà publiés |',
             '',
             'L’autorité de domaine (DR/DA/trafic) n’est **pas** notée : aucun outil de mesure d’autorité n’est '
             'disponible dans notre environnement, et nous n’inventons pas cet indicateur.', '',
             '## Les 44 prospects, par score', '',
             '| Score | Domaine | Nature | Pays | Contact identifié |',
             '|---|---|---|---|---|']
    for score, domaine, nature, pays, contact in notes:
        top10.append('| %d | %s | %s | %s | %s |' % (score, domaine, nature, pays,
                                                     (contact[0] + ' — ' + contact[1]) if contact else '— '))
    top10 += ['', '## Top 10 (priorité de travail)', '']
    for i, (score, domaine, nature, pays, contact) in enumerate(notes[:10], 1):
        top10.append('%d. **%s** — score %d — %s (%s)' % (i, domaine, score, nature, pays))
    top10 += ['', '## Top 5 (priorité absolue)', '']
    for item in TOP5:
        contact = CONTACTS.get(item['domaine'])
        top10 += ['### %d. %s' % (item['rang'], item['domaine']),
                  '',
                  '- Canal visé : %s' % item['canal'],
                  '- Pourquoi cette cible : %s' % item['raison'],
                  '- Actif COURTIARK proposé : %s' % item['actif'],
                  '- Contact : %s' % ((contact[0] + ' — ' + contact[1]) if contact else
                                      'aucun e-mail public trouvé : passage par le formulaire du site'),
                  '- Complémentarité : %s' % item['complementarite'],
                  '']
    top10 += ['## État réel', '',
              '- Aucun message envoyé : les 5 brouillons sont prêts mais attendent votre validation.',
              '- Aucun achat de lien, aucun échange de liens en réseau, aucun annuaire spam.',
              '- Aucune inscription sur une plateforme d’avis (G2, Capterra, GetApp) : ces inscriptions supposent '
              'un compte et une validation par e-mail, donc une action de votre part.', '']

    drafts = ['# COURTIARK — Messages d’approche (brouillons, aucun envoi effectué)', '',
              'Chaque message part d’un élément réel lu sur le site du destinataire. Rien n’est envoyé : '
              'chaque envoi attend votre accord.', '']
    modeles = {
        'courtage-magazine.fr': """Objet : Un guide « 25 points pour organiser un cabinet » à publier chez vous ?

Bonjour Laurent,

Votre article « Migration CRM courtier : la checklist de reprise des dossiers » traite exactement le sujet sur
lequel nous travaillons tous les jours, et votre rubrique « Gestion & Relation client » est la bonne place pour
la suite.

Nous éditons COURTIARK, un CRM et cockpit IA pour cabinets de courtage. Nous avons rédigé une liste de
25 points pour organiser un cabinet de courtage (dossiers, relances, pièces, échéances, commissions, accès,
mesure). Elle est utilisable sans logiciel et existe en PDF : https://courtiark.fr/guides/organiser-cabinet-courtage-25-points

Deux options, comme vous préférez :
1. Vous la publiez en article invité, avec un lien vers la ressource ;
2. Nous vous fournissons un contenu inédit sur la reprise de données d'un cabinet (ce qui se perd, ce qui se
   vérifie, dans quel ordre), rédigé pour vos lecteurs et non pour nous.

Dans les deux cas, vous gardez la main éditoriale. Je peux vous envoyer le texte avant publication.

Bien à vous,
[Nom] — COURTIARK — contact@courtiark.fr""",
        'digital-et-assurance.com': """Objet : Interview : ce qu'un cabinet de courtage mesure vraiment avant/après automatisation

Bonjour Alexandre,

Vos analyses sur l'IA et la sortie du legacy dans l'assurance posent la bonne question : ce que la
transformation change réellement dans le travail. Nous avons un angle concret et chiffrable côté courtiers.

Nous éditons COURTIARK (CRM et cockpit IA pour cabinets de courtage, France et Suisse). Nous mesurons
l'usage réel, y compris quand il est décevant : sur nos deux premiers comptes pilotes, la seule activité
constatée a été l'ouverture d'un comparateur et aucune utilisation métier — nous le documentons plutôt que
de le maquiller.

Proposition : une interview ou une analyse courte sur « ce qu'un cabinet de courtage peut automatiser, et ce
qui doit rester humain », avec les limites que nous avons constatées (relecture obligatoire, aucun envoi
automatique au client, frontière du conseil). Pas de chiffre inventé : nous dirons ce que nous mesurons et ce
que nous ne mesurons pas.

Bien à vous,
[Nom] — COURTIARK — contact@courtiark.fr""",
        'aca-courtiers.ch': """Objet : Un outil gratuit à proposer à vos membres (calcul de charge administrative)

Bonjour,

Votre veille documentaire et votre guide sur la collaboration responsable en prévoyance montrent que vos
membres cherchent d'abord des repères utilisables. Nous avons deux outils gratuits qui peuvent entrer dans
les avantages membres.

Nous éditons COURTIARK, un outil de gestion pour intermédiaires d'assurance (France et Suisse). Nos outils
publics ne demandent ni compte ni carte : un calculateur de charge administrative et une checklist de
renouvellement en 16 points, à garder dans le dossier.

Proposition : les mettre à disposition de vos membres depuis votre page « avantages », et vous fournir si vous
le souhaitez une note courte sur l'organisation documentaire d'un cabinet en Suisse romande. Aucun échange
d'argent, aucune demande d'exclusivité.

Si le sujet vous paraît hors de votre ligne éditoriale, dites-le simplement et je n'insisterai pas.

Bien à vous,
[Nom] — COURTIARK — contact@courtiark.fr""",
        'orica.fr': """Objet : Support de travail pour vos modules d'organisation de cabinet

Bonjour,

Vos parcours de formation couvrent l'organisation et la conformité du cabinet de courtage. Nous avons deux
checklists qui servent souvent de support en formation, et elles sont libres d'usage :
- checklist dossier client (27 points, de l'ouverture au renouvellement) :
  https://courtiark.fr/outils/checklist-dossier-courtier-assurance
- checklist renouvellement (16 points, séquence 90 jours avant l'échéance) :
  https://courtiark.fr/outils/checklist-renouvellement-assurance
(versions PDF téléchargeables, sans formulaire)

Nous éditons COURTIARK, un outil de gestion pour cabinets de courtage. Proposition simple : que vos
formateurs puissent les utiliser en séance, avec mention de la source. Si cela vous intéresse, je vous envoie
aussi une fiche de 2 pages sur la traçabilité du devoir de conseil dans un dossier.

Aucune contrepartie demandée au-delà de la mention de la source.

Bien à vous,
[Nom] — COURTIARK — contact@courtiark.fr""",
        'ascourtage.fr': """Objet : Notre calculateur de taux de transformation (lead → devis → contrat) pour votre audience

Bonjour,

Votre site accompagne les courtiers sur le terrain métier. Nous avons publié un outil gratuit qui répond à une
question qu'ils se posent tous : où les affaires se perdent-elles entre les leads, les devis et les contrats ?
https://courtiark.fr/outils/calculateur-taux-transformation-assurance

Il calcule lead → devis, devis → contrat, le taux global et le nombre de devis non convertis. Formules
affichées, calcul dans le navigateur, aucune donnée transmise, aucune adresse demandée.

Si vous le jugez utile pour votre audience, vous pouvez le relier depuis une page de ressources. Et si vous
préférez un contenu rédigé, je vous prépare un texte court sur « deux taux à suivre au lieu d'un », avec les
chiffres expliqués, à publier sous votre nom.

Bien à vous,
[Nom] — COURTIARK — contact@courtiark.fr""",
    }
    for item in TOP5:
        contact = CONTACTS.get(item['domaine'])
        drafts += ['## %d. %s' % (item['rang'], item['domaine']),
                   '',
                   '- Destinataire : %s' % (contact[0] if contact else 'à identifier via le formulaire du site'),
                   '- Adresse : %s' % (contact[1] if contact else 'non publiée par le site'),
                   '- Actif proposé : %s' % item['actif'],
                   '- Statut : brouillon, non envoyé',
                   '',
                   '```',
                   modeles.get(item['domaine'], '(message à rédiger)').strip(),
                   '```', '']
    return {'top10': '\n'.join(top10) + '\n', 'drafts': '\n'.join(drafts) + '\n'}


if __name__ == '__main__':
    raise SystemExit(main())
