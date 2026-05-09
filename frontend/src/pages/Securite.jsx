import { ShieldCheck, Lock, Database, KeyRound } from 'lucide-react'

const items = [
  {
    icon: ShieldCheck,
    title: 'Hébergement & infrastructure',
    text: 'COURTIA s’appuie sur une infrastructure cloud sécurisée. Les accès applicatifs sont protégés par authentification JWT et contrôle de rôle côté API.',
  },
  {
    icon: Lock,
    title: 'Protection des accès',
    text: 'Les tokens OAuth (Google/Gmail) sont conservés côté backend uniquement, chiffrés avec la clé serveur. Aucun secret sensible n’est exposé dans le frontend.',
  },
  {
    icon: Database,
    title: 'Données traitées',
    text: 'Les données client, contrats, tâches, interactions et documents sont stockées pour exécuter les fonctionnalités métier courtier. La minimisation des données est privilégiée.',
  },
  {
    icon: KeyRound,
    title: 'Responsabilité humaine',
    text: 'ARK assiste la priorisation et la préparation des actions. Les décisions réglementaires et commerciales restent sous la responsabilité du courtier.',
  },
]

export default function Securite() {
  return (
    <div className="min-h-screen bg-[#030712] text-white px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black">Sécurité COURTIA</h1>
        <p className="mt-2 text-sm text-white/70">
          Vue synthétique des mesures de sécurité, de confidentialité et de gouvernance des données.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-lg bg-white/10 p-2">
                  <Icon size={16} />
                </div>
                <h2 className="text-lg font-bold">{item.title}</h2>
                <p className="mt-2 text-sm text-white/70">{item.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
