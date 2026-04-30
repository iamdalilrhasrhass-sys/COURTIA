import { Brain, Zap, Shield, TrendingUp, Clock, Users, Target, Check } from 'lucide-react'
import ScrollReveal from './ScrollReveal'
import ArkAuroraOrb from './landing/ArkAuroraOrb'

const capabilities = [
  { icon: Brain, text: "Résumé instantané de chaque client" },
  { icon: Zap, text: "Analyse du portefeuille en temps réel" },
  { icon: Shield, text: "Suggestions de relance personnalisées" },
  { icon: TrendingUp, text: "Détection d'opportunités multi-équipement" },
  { icon: Clock, text: "Alertes clients dormants ou à risque" },
  { icon: Users, text: "Aide à la conformité et documentation" },
  { icon: Target, text: "Morning Brief quotidien avec priorités" },
  { icon: Check, text: "Génération de messages commerciaux" },
]

export default function ArkOrbSection() {
  return (
    <div>
      {/* Bulle de savon premium — transparente, irisée, nacrée */}
      <div className="flex items-center justify-center mb-10">
        <ArkAuroraOrb />
      </div>

      {/* Grille de capacités */}
      <div className="ark-capabilities-grid">
        {capabilities.map((cap, i) => (
          <ScrollReveal key={i} delay={i * 0.05}>
            <div className="ark-capability-card">
              <cap.icon size={15} className="ark-cap-icon" />
              <span className="ark-cap-text">{cap.text}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <style>{`
        .ark-capabilities-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          max-width: 640px;
          margin: 0 auto;
        }

        .ark-capability-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .ark-capability-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(175,169,236,0.15);
          transform: translateX(2px);
        }

        .ark-cap-icon {
          color: #a78bfa;
          flex-shrink: 0;
          opacity: 0.8;
        }

        .ark-cap-text {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          line-height: 1.4;
        }

        @media (max-width: 640px) {
          .ark-capabilities-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .ark-capability-card {
            padding: 10px 12px;
          }
          .ark-cap-text {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}
