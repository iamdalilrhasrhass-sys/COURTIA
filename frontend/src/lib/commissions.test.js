import { describe, expect, it } from 'vitest'
import {
  formatCommissionCurrency,
  getCommissionStatusMeta,
  summarizeCommissions,
} from './commissions'
import { configurerContexte } from './monnaie'

/*
  ARBITRAGE DE LA RÉGRESSION (20/09/2026) — l'espace INSÉCABLE est la bonne forme.
  ---------------------------------------------------------------------------
  Ce test attendait `'121 €'` avec une espace SÉCABLE (U+0020). L'implémentation
  produit la forme typographique française réelle : une espace insécable avant le
  symbole monétaire (U+00A0) et, pour les milliers en fr-FR, une espace fine
  insécable (U+202F). Les deux chaînes sont indiscernables à l'œil, d'où le test
  rouge « expected '121 €' to be '121 €' ».

  Trancher en faveur de l'implémentation est le seul choix correct :
    • `'121 €'` (espace sécable) peut se couper en fin de ligne, ce qui sépare le
      montant de sa devise sur un écran de commissions — un défaut d'affichage
      réel, pas une préférence ;
    • la forme vient d'`Intl.NumberFormat` pour la LOCALE du cabinet
      (`lib/monnaie`), donc elle n'est pas codée à la main ici ;
    • rien n'est mis en dur : ni montant, ni euro. Le test le prouve ci-dessous en
      passant le cabinet en Suisse (CHF) et en vérifiant qu'AUCUN « € » ne sort.
  Les attentes écrivent donc explicitement \u00a0 et \u202f, pour qu'une espace
  sécable ne puisse plus jamais passer pour un détail invisible.
*/

describe('commissions frontend helpers', () => {
  it('formate une commission en euros pour un cabinet français (espace insécable)', () => {
    configurerContexte({ pays: 'FR', langue: 'fr' })
    expect(formatCommissionCurrency(120.5)).toBe('121\u00a0€')
    // Milliers : espace fine insécable (U+202F) puis espace insécable (U+00A0).
    expect(formatCommissionCurrency(1200)).toBe('1\u202f200\u00a0€')
    expect(formatCommissionCurrency(null)).toBe('—')
  })

  it('un cabinet suisse est formaté en CHF — jamais en euros', () => {
    try {
      configurerContexte({ pays: 'CH', langue: 'fr' })
      const rendu = formatCommissionCurrency(1200)
      expect(rendu).toBe("1'200\u00a0CHF")
      expect(rendu).not.toContain('€')
      expect(formatCommissionCurrency(120.5)).not.toContain('€')
    } finally {
      // Le contexte de devise est un état de module : on le remet en France pour
      // ne pas colorer les tests suivants.
      configurerContexte({ pays: 'FR', langue: 'fr' })
    }
  })

  it('maps status to business labels and tones', () => {
    expect(getCommissionStatusMeta('paid')).toMatchObject({ label: 'Payée', tone: 'success' })
    expect(getCommissionStatusMeta('unknown')).toMatchObject({ label: 'Prévue', tone: 'info' })
  })

  it('summarizes expected, received and pending amounts', () => {
    expect(summarizeCommissions([
      { expected_amount_eur: 200, received_amount_eur: 150 },
      { expected_amount_cents: 10000, received_amount_cents: 0 },
    ])).toMatchObject({
      expected: 300,
      received: 150,
      pending: 150,
      count: 2,
    })
  })
})
