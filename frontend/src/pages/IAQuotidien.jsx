import React from "react"
import { motion } from "framer-motion"
import { Sun, Calendar, FileText, TrendingUp, Moon, Target, Shield } from "lucide-react"

const C = { bg: "#050510", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: "#fff", t2: "#9CA3AF", purple: "#8B5CF6", blue: "#3B82F6", yellow: "#F59E0B", red: "#EF4444" }

const features = [
  { icon: Sun, color: C.yellow, title: "Matin", desc: "ARK prépare les priorités du jour." },
  { icon: Calendar, color: C.red, title: "Avant RDV", desc: "ARK résume le dossier client." },
  { icon: FileText, color: C.blue, title: "Après échange", desc: "ARK suggère une relance propre." },
  { icon: TrendingUp, color: C.purple, title: "Portefeuille", desc: "ARK détecte les opportunités utiles." },
  { icon: Moon, color: C.t2, title: "Fin de journée", desc: "ARK récupère les actions restantes." }
]

export default function IAQuotidien() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: C.bg, minHeight: '100vh', padding: '40px 20px', color: C.text, fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ color: C.t2, fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Intelligence Artificielle</h2>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>ARK au quotidien</h1>
        <p style={{ color: C.t2, fontSize: 18, marginBottom: 40, lineHeight: 1.6 }}>Votre assistant IA qui prépare, suggère et priorise. Vous gardez le contrôle.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: `${f.color}15`, padding: 12, borderRadius: 12 }}><f.icon size={24} color={f.color} /></div>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{f.title}</h3>
                <p style={{ color: C.t2, fontSize: 14 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60, textAlign: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
          <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>ARK assiste, prépare et suggère. Le courtier garde les mains sur les décisions.</p>
          <p style={{ color: C.t2 }}>Tout votre cabinet dans un cockpit — <a href="https://courtiark.fr" style={{ color: C.purple }}>courtiark.fr</a></p>
        </div>
      </div>
    </motion.div>
  )
}