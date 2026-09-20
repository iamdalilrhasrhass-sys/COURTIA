/**
 * pieceIdentite.suisse.test.js — UNE PIÈCE D'IDENTITÉ SUISSE EST LUE COMME TELLE.
 *
 * Défaut mesuré le 20/09/2026 (P2 CH-028) : l'extracteur ne connaissait que la
 * CNI et le titre de séjour FRANÇAIS (« expert en lecture de documents d'identité
 * français »), et sa validation appliquait le format français (numéro de CNI à
 * 12 caractères) à toute pièce. Une carte d'identité suisse tombait donc en
 * « autre » ou était signalée comme douteuse. Aucun format suisse n'est inventé :
 * on reconnaît la pièce, on ne lui impose pas un format français.
 */
const {
  detectPieceType, validateNumero, validateAndNormalize, SCHEMA, SYSTEM_PROMPT,
} = require('./pieceIdentite')

describe('pieceIdentite — pièces suisses', () => {
  test('la carte d’identité suisse est reconnue (et non « autre »)', () => {
    const texte = [
      'CONFÉDÉRATION SUISSE',
      'CARTE D\'IDENTITÉ / IDENTITÄTSKARTE / CARTE D\'IDENTITA',
      'MUSTER', 'HANS', 'N° C1234567',
    ].join('\n')
    expect(detectPieceType(texte)).toBe('carte_identite_ch')
  })

  test('une carte suisse n’est PAS lue comme une CNI française', () => {
    const texte = 'SCHWEIZERISCHE EIDGENOSSENSCHAFT\nCARTE D\'IDENTITÉ\nMUSTER HANS'
    expect(detectPieceType(texte)).not.toBe('cni')
  })

  test('le permis de séjour suisse est reconnu', () => {
    expect(detectPieceType('CONFÉDÉRATION SUISSE\nPERMIS DE SÉJOUR (livret pour étrangers)')).toBe('permis_sejour')
    expect(detectPieceType('RÉPUBLIQUE FRANÇAISE\nTITRE DE SÉJOUR')).toBe('titre_sejour')
  })

  test('le permis de circulation (carte grise suisse) est reconnu', () => {
    expect(detectPieceType('CONFÉDÉRATION SUISSE\nPERMIS DE CIRCULATION')).toBe('permis_circulation')
  })

  test('la CNI française reste reconnue exactement comme avant', () => {
    expect(detectPieceType('RÉPUBLIQUE FRANÇAISE\nCARTE NATIONALE D\'IDENTITÉ')).toBe('cni')
    expect(detectPieceType('PASSEPORT')).toBe('passeport')
    expect(detectPieceType('PERMIS DE CONDUIRE')).toBe('permis')
  })

  test('aucun format de numéro français n’est imposé à une pièce suisse', () => {
    // 8 caractères : refusé comme CNI française (12 attendus), accepté comme
    // carte d'identité suisse.
    expect(validateNumero('C1234567', 'cni').valid).toBe(false)
    expect(validateNumero('C1234567', 'carte_identite_ch').valid).toBe(true)
    expect(validateNumero('12345', 'permis_sejour').valid).toBe(true)
    // Rien n'est inventé pour autant : un numéro absent est SIGNALÉ.
    const court = validateNumero('12', 'carte_identite_ch')
    expect(court.valid).toBe(false)
    expect(String(court.warning)).toMatch(/court/i)
  })

  test('un type mal lu (« cni » pour une pièce suisse) est reclassé, sans perdre les champs', () => {
    const resultat = validateAndNormalize({
      type_piece: 'cni',
      nom: 'MUSTER',
      prenom: 'Hans',
      date_naissance: '1980-04-12',
      numero: 'C1234567',
      autorite: 'CONFÉDÉRATION SUISSE',
    })
    expect(resultat.fields.type_piece).toBe('carte_identite_ch')
    expect(resultat.fields.nom).toBe('MUSTER')
    expect(resultat.fields.prenom).toBe('Hans')
    expect(resultat.isValid).toBe(true)
  })

  test('le schéma et le prompt décrivent les deux marchés servis', () => {
    const enumere = SCHEMA.properties.type_piece.enum
    expect(enumere).toContain('carte_identite_ch')
    expect(enumere).toContain('permis_sejour')
    expect(enumere).toContain('permis_circulation')
    // Les types français restent déclarés : rien n'est retiré.
    expect(enumere).toContain('cni')
    expect(enumere).toContain('titre_sejour')
    expect(SYSTEM_PROMPT).toMatch(/Suisse/)
    expect(SYSTEM_PROMPT).toMatch(/CARTE D'IDENTITÉ SUISSE/)
  })
})
