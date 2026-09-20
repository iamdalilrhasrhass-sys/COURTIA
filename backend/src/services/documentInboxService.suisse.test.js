/**
 * documentInboxService.suisse.test.js — LE CLASSEMENT DOCUMENTAIRE PARLE AUSSI
 * LE VOCABULAIRE SUISSE.
 *
 * Défaut mesuré le 20/09/2026 (P2 CH-029) : le classement ne connaissait que
 * « KBIS / RCS » (France) pour la pièce d'entreprise et « RIB » pour le compte
 * bancaire. Un cabinet suisse déposait un « extrait du registre du commerce
 * (RC) », un « permis de circulation » ou un document ne portant qu'un IBAN :
 * la pièce tombait dans « Autre », donc comptait comme MANQUANTE dans la
 * checklist du dossier. Les clés de catégorie sont inchangées (des documents
 * déjà classés les portent en base) : seuls le libellé et les mots-clés sont
 * complétés.
 */
jest.mock('../db', () => ({ query: jest.fn() }))

const { guessCategory, DOCUMENT_CATEGORIES } = require('./documentInboxService')

describe('classement documentaire — vocabulaire suisse', () => {
  test('l’extrait du registre du commerce (RC) est classé comme pièce d’entreprise', () => {
    for (const nom of [
      'extrait_rc_muster_sa.pdf',
      'Extrait du registre du commerce.pdf',
      'registre_du_commerce_2026.pdf',
      'extrait-rc.pdf',
    ]) {
      expect({ nom, categorie: guessCategory(nom) }).toEqual({ nom, categorie: 'kbis' })
    }
    // Le vocabulaire français continue de fonctionner, à l'identique.
    expect(guessCategory('kbis_muster.pdf')).toBe('kbis')
    expect(guessCategory('extrait kbis.pdf')).toBe('kbis')
    expect(guessCategory('rcs_2026.pdf')).toBe('kbis')
  })

  test('un document bancaire identifié par son IBAN est classé (Suisse comprise)', () => {
    expect(guessCategory('iban_muster.pdf')).toBe('rib')
    expect(guessCategory('coordonnees_bancaires.pdf')).toBe('rib')
    expect(guessCategory('rib_muster.pdf')).toBe('rib')
  })

  test('le permis de circulation suisse est classé comme document de véhicule', () => {
    expect(guessCategory('permis_de_circulation.pdf')).toBe('carte_grise')
    expect(guessCategory('carte grise.pdf')).toBe('carte_grise')
  })

  test('une pièce d’identité suisse est classée comme pièce d’identité', () => {
    expect(guessCategory('carte_identite_suisse.pdf')).toBe('piece_identite')
    expect(guessCategory('permis_de_sejour.pdf')).toBe('piece_identite')
  })

  test('les libellés nomment les deux marchés servis', () => {
    expect(DOCUMENT_CATEGORIES.kbis.label).toMatch(/registre du commerce \(RC\)/)
    expect(DOCUMENT_CATEGORIES.kbis.label).toMatch(/Kbis/)
    expect(DOCUMENT_CATEGORIES.rib.label).toMatch(/IBAN/)
    expect(DOCUMENT_CATEGORIES.carte_grise.label).toMatch(/permis de circulation/i)
  })

  test('les clés de catégorie n’ont pas changé (documents déjà classés lisibles)', () => {
    expect(Object.keys(DOCUMENT_CATEGORIES)).toEqual([
      'carte_grise', 'permis', 'piece_identite', 'rib', 'justificatif_domicile',
      'releve_information', 'kbis', 'contrat_signe', 'devis', 'mandat', 'autre',
    ])
  })
})
