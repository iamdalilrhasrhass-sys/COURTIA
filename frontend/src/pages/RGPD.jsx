import { FileCheck2, UserCheck, Trash2, Download } from 'lucide-react'

const blocks = [
  {
    icon: FileCheck2,
    title: 'Base légale & finalité',
    text: 'COURTIA traite les données strictement nécessaires à la relation courtier-client: pilotage portefeuille, suivi contrats, tâches, documents et préparation des actions.',
  },
  {
    icon: UserCheck,
    title: 'Droits des personnes',
    text: 'Les utilisateurs peuvent demander l’accès, la rectification, la limitation ou la suppression des données selon le cadre RGPD applicable.',
  },
  {
    icon: Download,
    title: 'Export des données',
    text: 'Les données métier peuvent être exportées pour continuité d’activité ou portabilité (selon modules disponibles).',
  },
  {
    icon: Trash2,
    title: 'Suppression & conservation',
    text: 'La conservation est limitée au besoin opérationnel et réglementaire. Les demandes de suppression sont prises en charge selon les obligations légales en vigueur.',
  },
]

export default function RGPD() {
  return (
    <div className="min-h-screen bg-[#020817] text-white px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black">RGPD & protection des données</h1>
        <p className="mt-2 text-sm text-white/70">
          COURTIA applique une approche de minimisation des données et de sécurité par défaut pour les usages courtier.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {blocks.map((block) => {
            const Icon = block.icon
            return (
              <article key={block.title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-lg bg-white/10 p-2">
                  <Icon size={16} />
                </div>
                <h2 className="text-lg font-bold">{block.title}</h2>
                <p className="mt-2 text-sm text-white/70">{block.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
