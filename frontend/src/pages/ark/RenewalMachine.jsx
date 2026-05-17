import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ExternalLink, Lightbulb, CheckCircle2, Wrench } from "lucide-react"

const C = { bg: "#050510", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: "#fff", t2: "#9CA3AF", t3: "#6B7280", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B" }
const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }

export default function RenewalMachine() {
  const n = useNavigate()
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: 24, maxWidth: 840 }}>
      <button onClick={() => n("/dashboard-legacy")} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 }}>
        <ArrowLeft size={16} />Retour au cockpit
      </button>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>Renewal Machine</h1>
          <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${C.purple}15`, color: C.purple, border: `1px solid ${C.purple}30` }}>Partiel</span>
        </div>
        <p style={{ fontSize: 16, color: C.t2, lineHeight: 1.5 }}>Anticipez chaque échéance et maximisez votre taux de rétention</p>
      </div>
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}><Lightbulb size={20} color={C.purple} style={{ marginTop: 2 }} /><div><h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>Ce que ça fait</h3><p style={{ fontSize: 14, color: C.t2, lineHeight: 1.7 }}>La Renewal Machine scanne votre portefeuille, identifie les contrats à échéance, priorise les actions et automatise les relances.</p></div></div>
      </div>
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>⚡ Workflow métier</h3>
        <ol style={{ paddingLeft: 0, listStyle: "none" }}>
          {["Scan quotidien du portefeuille (échéances J-90 à J-7)", "Scoring de risque de départ par contrat", "Priorisation des actions (urgence haute/moyenne/basse)", "Relance automatique client (email puis SMS)", "Proposition de renouvellement ou d'alternative"].map((s,i) => (
            <li key={i} style={{ marginBottom: 10, color: C.t2, fontSize: 14, lineHeight: 1.6 }}><span style={{ color: C.text, fontWeight: 600, marginRight: 8 }}>{i+1}.</span>{s}</li>
          ))}
        </ol>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ ...cardStyle }}><h3 style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={16} />Déjà disponible</h3><ul style={{ paddingLeft: 0, listStyle: "none" }}>{["Calendrier d'échéances", "Scoring de rétention", "Relances programmables"].map((s,i) => (<li key={i} style={{ marginBottom: 6, color: C.green, fontSize: 13 }}>✓ {s}</li>))}</ul></div>
        <div style={{ ...cardStyle }}><h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}><Wrench size={16} />Reste à connecter</h3><p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>Le calendrier d'échéances est actif et le scoring de rétention est calculé. L'automatisation des relances multi-canal est en cours de finalisation.</p></div>
      </div>
      <div style={{ ...cardStyle, borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 8 }}>🎯 Prochaine action</h3>
        <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.7, marginBottom: 12 }}>Activer les relances automatiques email+SMS, brancher les templates de proposition de renouvellement.</p>
        <button onClick={() => n("/parametres")} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", color: C.purple, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><ExternalLink size={14} />Aller aux paramètres</button>
      </div>
      <div style={{ marginTop: 32, padding: "16px 20px", borderRadius: 12, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
        <p style={{ fontSize: 14, color: "#6EE7B7", lineHeight: 1.6, margin: 0 }}><strong>💡 Bénéfice courtier :</strong> Passez de 60 % à 85 %+ de taux de rétention. Chaque contrat qui arrive à échéance est traité avant que le client ne regarde ailleurs.</p>
      </div>
    </motion.div>
  )
}
