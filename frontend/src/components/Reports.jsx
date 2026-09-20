import { Download, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { marcheCourante } from '../lib/marche'

/**
 * Types de rapport proposés, par marché.
 *
 * POURQUOI : l'écran annonçait « ACPR » (autorité de supervision française,
 * sans compétence en Suisse) à tous les cabinets. La liste suit maintenant le
 * marché du cabinet ; la colonne suisse reprend le cadre déjà déclaré pour le
 * marché CH dans market/marketContext.js (« LSA · FINMA · nLPD ») — elle
 * n'ajoute aucune affirmation réglementaire nouvelle.
 */
const RAPPORTS_PAR_MARCHE = {
  FR: [
    { title: 'DDA', subtitle: 'Directive sur la Distribution d’Assurances', color: 'from-blue-500' },
    { title: 'RGPD', subtitle: 'Règlement Général de Protection des Données', color: 'from-green-500' },
    { title: 'ACPR', subtitle: 'Autorité de Contrôle Prudentiel', color: 'from-purple-500' },
  ],
  CH: [
    { title: 'LSA', subtitle: 'Loi sur le contrat d’assurance', color: 'from-blue-500' },
    { title: 'nLPD', subtitle: 'Loi fédérale sur la protection des données', color: 'from-green-500' },
    { title: 'Registre', subtitle: 'Registre de conformité du cabinet', color: 'from-purple-500' },
  ],
}

export default function Reports() {
  const market = marcheCourante()
  const reports = RAPPORTS_PAR_MARCHE[market === 'CH' ? 'CH' : 'FR']
  // Aucun historique de conformité n'est fourni par l'API ici : l'écran ne
  // fabrique donc ni courbe ni « rapports récents ». Il dit ce qu'il sait.
  const historique = []

  return (
    <div className="ml-64 p-8">
      <h2 className="text-4xl font-black text-gradient mb-8">Rapports et Conformité</h2>

      {/* Report Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {reports.map((report, idx) => (
          <div key={idx} className={`glass p-6 rounded-lg gradient-blue-cyan bg-gradient-to-br ${report.color}`}>
            <p className="text-lg font-bold text-white mb-2">{report.title}</p>
            <p className="text-sm text-slate-200 mb-4">{report.subtitle}</p>
            <button className="btn-secondary w-full flex items-center justify-center gap-2">
              <Download size={16} />
              Télécharger
            </button>
          </div>
        ))}
      </div>

      {/* Compliance Chart */}
      <div className="glass p-6 rounded-lg mb-8">
        <h3 className="text-2xl font-bold text-cyan mb-6 flex items-center gap-2">
          <BarChart3 size={24} />
          Conformité globale
        </h3>
        {historique.length === 0 ? (
          <p className="text-sm text-slate-400" style={{ padding: '24px 0' }}>
            Aucune donnée de conformité sur la période : le graphique s'affichera dès que des
            audits réels existeront. Aucune valeur n'est estimée ni affichée par défaut.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={historique}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.2)" />
              <XAxis dataKey="mois" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
                labelStyle={{ color: '#06b6d4' }}
              />
              <Legend />
              <Bar dataKey="audits" fill="#3b82f6" name="Audits" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Reports */}
      <div className="glass p-6 rounded-lg">
        <h3 className="text-xl font-bold text-cyan mb-4">Rapports récents</h3>
        <div className="space-y-3">
          {/* Les trois lignes de démonstration (dont « 2026-03-15 · Rapport ACPR
              Annuel · ✓ Approuvé ») ont été supprimées : un cabinet neuf voyait
              des rapports qu'il n'avait jamais produits, approuvés par une
              autorité étrangère. Un état vide est moins flatteur, il est vrai. */}
          {historique.length === 0 ? (
            <p className="text-sm text-slate-400" style={{ padding: '12px 0' }}>
              Aucun rapport produit pour l'instant. Vos rapports apparaîtront ici une fois générés.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
