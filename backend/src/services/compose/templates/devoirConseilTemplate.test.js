/**
 * devoirConseilTemplate.test.js — AUCUNE MENTION DE VALIDATION QUI N'A PAS EU LIEU.
 *
 * POURQUOI CE TEST (défaut P1 IA-017, corrigé le 20/09/2026)
 * Le devoir de conseil — pièce contractuelle remise au client — imprimait
 * TOUJOURS :
 *     « 🤖 Cette analyse a été générée par ARK, l'intelligence artificielle de
 *       COURTIA, et validée par votre courtier. »
 * y compris quand aucune analyse ARK n'accompagnait le document et qu'aucun
 * courtier n'avait validé quoi que ce soit. L'en-tête portait de plus le badge
 * « Généré par ARK IA » sur tous les documents, même rédigés à la main.
 * La section 5 conservait enfin un raisonnement de repli local (trois phrases
 * inventées sur le budget, le profil de risque et le « meilleur équilibre »).
 *
 * Le test vérifie les mentions SUR LE PDF RÉEL (les flux du document sont
 * gonflés et le texte hexadécimal est décodé) : une chaîne présente dans le
 * binaire ne peut pas échapper au contrôle.
 */
const zlib = require('zlib')
const {
  generateDevoirConseil,
  drawConseilHeader,
  drawSection5Reasoning,
} = require('./devoirConseilTemplate')
const fs = require('fs')
const path = require('path')

/** Décode le texte réellement écrit dans un PDF produit par pdfkit. */
function texteDuPdf(buf) {
  const brut = buf.toString('latin1')
  const morceaux = []
  const re = /stream\r?\n/g
  let m
  while ((m = re.exec(brut))) {
    const debut = m.index + m[0].length
    const fin = brut.indexOf('endstream', debut)
    if (fin < 0) continue
    let contenu = ''
    try { contenu = zlib.inflateSync(Buffer.from(brut.slice(debut, fin), 'latin1')).toString('latin1') } catch (_) { continue }
    for (const hex of contenu.matchAll(/<([0-9a-fA-F]+)>/g)) {
      morceaux.push(Buffer.from(hex[1], 'hex').toString('latin1'))
    }
  }
  return morceaux.join('')
}

/** « doc » instrumenté : enregistre chaque `.text()` réellement demandé. */
function creerDoc() {
  const doc = { textes: [] }
  const chaine = () => doc
  for (const methode of ['fillColor', 'fontSize', 'rect', 'fill', 'fillOpacity', 'moveTo', 'lineTo', 'stroke', 'font', 'moveDown']) {
    doc[methode] = chaine
  }
  doc.text = (contenu) => { doc.textes.push(String(contenu)); return doc }
  return doc
}

const DONNEES = {
  client: { nom: 'Martin', prenom: 'Élise' },
  needs: {},
  recommendation: {},
  alternatives: [],
  broker: { company_name: 'Helvetia Audit SA', market: 'CH' },
  generatedAt: new Date('2026-09-20T10:00:00Z'),
}

describe('devoir de conseil — mentions de validation', () => {
  test('sans analyse ARK : le PDF ne prétend ni génération par ARK ni validation', async () => {
    const pdf = await generateDevoirConseil({ ...DONNEES })
    const texte = texteDuPdf(pdf)

    expect(texte).not.toMatch(/valid\u00e9e par votre courtier/i)
    expect(texte).not.toMatch(/ARK IA/)
    expect(texte).not.toMatch(/g\u00e9n\u00e9r\u00e9e par ARK/i)
    // Le document se déclare pour ce qu'il est : un projet à valider.
    expect(texte).toContain('Projet à')
    expect(texte).toContain('VALIDER')
    expect(texte).toMatch(/Aucune analyse automatis\u00e9e ARK/)
    expect(texte).toContain('DEVOIR DE CONSEIL')
  })

  test('avec analyse ARK : attribution à ARK mais jamais « validée par votre courtier »', async () => {
    const pdf = await generateDevoirConseil({
      ...DONNEES,
      aiReasoning: 'Le besoin déclaré est une couverture MRH avec franchise réduite.',
    })
    const texte = texteDuPdf(pdf)

    expect(texte).toContain('ARK IA')
    expect(texte).toContain('Projet à valider par votre courtier')
    expect(texte).not.toMatch(/valid\u00e9e par votre courtier/i)
    expect(texte).toContain('couverture MRH')
  })

  test('section 5 : plus aucun raisonnement de repli fabriqué', () => {
    const vide = creerDoc()
    drawSection5Reasoning(vide, null, {})
    const sansAnalyse = vide.textes.join('\n')
    expect(sansAnalyse).not.toMatch(/meilleur \u00e9quilibre entre couverture et co\u00fbt/i)
    expect(sansAnalyse).not.toMatch(/valid\u00e9e par votre courtier/i)
    expect(sansAnalyse).toMatch(/Aucune analyse automatis\u00e9e ARK/)
    expect(sansAnalyse).toMatch(/doit \u00eatre saisi par le courtier/)

    // Un raisonnement fourni par le cabinet n'est pas attribué à l'IA.
    const cabinet = creerDoc()
    drawSection5Reasoning(cabinet, null, { detailed_reasoning: 'Argumentaire rédigé par le cabinet.' })
    const txtCabinet = cabinet.textes.join('\n')
    expect(txtCabinet).toContain('Argumentaire rédigé par le cabinet.')
    expect(txtCabinet).toMatch(/Aucune analyse automatis\u00e9e ARK/)

    // Un raisonnement ARK est attribué à ARK, et reste un PROJET.
    const ark = creerDoc()
    drawSection5Reasoning(ark, 'Analyse ARK réellement produite.', {})
    const txtArk = ark.textes.join('\n')
    expect(txtArk).toMatch(/Analyse g\u00e9n\u00e9r\u00e9e par ARK/)
    expect(txtArk).toContain('Projet à valider par votre courtier')
    expect(txtArk).not.toMatch(/valid\u00e9e par votre courtier/i)
  })

  test('badge d’en-tête : ARK seulement s’il y a une analyse ARK', () => {
    const sans = creerDoc()
    drawConseilHeader(sans, { company_name: 'Cabinet QA' }, {}, false)
    expect(sans.textes.join('\n')).toContain('Projet à')
    expect(sans.textes.join('\n')).not.toContain('ARK IA')

    const avec = creerDoc()
    drawConseilHeader(avec, { company_name: 'Cabinet QA' }, {}, true)
    expect(avec.textes.join('\n')).toContain('ARK IA')
  })

  test('le fichier source ne contient plus de raisonnement de repli ni d’attestation de validation', () => {
    const source = fs.readFileSync(path.join(__dirname, 'devoirConseilTemplate.js'), 'utf8')
    // Les commentaires d'explication citent volontairement l'ancienne phrase :
    // on ne teste que le CODE.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((ligne) => !ligne.trim().startsWith('//'))
      .join('\n')

    expect(code).not.toMatch(/meilleur \u00e9quilibre entre couverture et co\u00fbt/i)
    expect(code).not.toMatch(/valid\u00e9e par votre courtier/i)
    expect(code).not.toMatch(/g\u00e9n\u00e9r\u00e9e par ARK, l'intelligence artificielle de COURTIA, et/i)
    // Le raisonnement de repli de l'ancienne version ne doit plus exister.
    expect(code).not.toMatch(/analyse de votre situation personnelle/i)
  })
})
