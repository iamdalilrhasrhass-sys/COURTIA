import React from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, ExternalLink, Lightbulb, CheckCircle2, Wrench } from "lucide-react"

const C = { bg: "#050510", card: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)", text: "#fff", t2: "#9CA3AF", t3: "#6B7280", purple: "#8B5CF6", green: "#10B981", amber: "#F59E0B" }
const cs = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }

export default function ApiCourtia() {
  const n = useNavigate()
  return React.createElement(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, style: { padding: 24, maxWidth: 840 } },
    React.createElement("button", { onClick: () => n("/dashboard-legacy"), style: { background: "none", border: "none", cursor: "pointer", color: C.t2, display: "flex", alignItems: "center", gap: 6, marginBottom: 24, fontSize: 13 } },
      React.createElement(ArrowLeft, { size: 16 }), "Retour au cockpit"
    ),
    React.createElement("div", { style: { marginBottom: 32 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 8 } },
        React.createElement("h1", { style: { fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" } }, "API COURTIA"),
        React.createElement("span", { style: { display: "inline-block", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` } }, "À connecter")
      ),
      React.createElement("p", { style: { fontSize: 16, color: C.t2, lineHeight: 1.5 } }, "Connectez COURTIA à votre écosystème existant")
    ),
    React.createElement("div", { style: { ...cs, marginBottom: 24 } },
      React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 12 } },
        React.createElement(Lightbulb, { size: 20, color: C.purple, style: { marginTop: 2 } }),
        React.createElement("div", null,
          React.createElement("h3", { style: { fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 } }, "Ce que ça fait"),
          React.createElement("p", { style: { fontSize: 14, color: C.t2, lineHeight: 1.7 } }, "L'API COURTIA permet d'intégrer votre CRM à vos outils existants.")
        )
      )
    ),
    React.createElement("div", { style: { ...cs, marginBottom: 24 } },
      React.createElement("h3", { style: { fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 } }, "⚡ Workflow métier"),
      React.createElement("ol", { style: { paddingLeft: 0, listStyle: "none" } },
                    React.createElement("li", { key: 0, style: { marginBottom: 10, color: C.t2, fontSize: 14, lineHeight: 1.6 } }, React.createElement("span", { style: { color: C.text, fontWeight: 600, marginRight: 8 } }, "1."), "Générez une clé API"),
            React.createElement("li", { key: 1, style: { marginBottom: 10, color: C.t2, fontSize: 14, lineHeight: 1.6 } }, React.createElement("span", { style: { color: C.text, fontWeight: 600, marginRight: 8 } }, "2."), "Consultez la doc Swagger"),
            React.createElement("li", { key: 2, style: { marginBottom: 10, color: C.t2, fontSize: 14, lineHeight: 1.6 } }, React.createElement("span", { style: { color: C.text, fontWeight: 600, marginRight: 8 } }, "3."), "Testez les endpoints"),
            React.createElement("li", { key: 3, style: { marginBottom: 10, color: C.t2, fontSize: 14, lineHeight: 1.6 } }, React.createElement("span", { style: { color: C.text, fontWeight: 600, marginRight: 8 } }, "4."), "Configurez les webhooks"),
            React.createElement("li", { key: 4, style: { marginBottom: 10, color: C.t2, fontSize: 14, lineHeight: 1.6 } }, React.createElement("span", { style: { color: C.text, fontWeight: 600, marginRight: 8 } }, "5."), "Surveillez les logs"),
      )
    ),
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 } },
      React.createElement("div", { style: { ...cs } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 } },
          React.createElement(CheckCircle2, { size: 16 }), "Déjà disponible"
        ),
        React.createElement("ul", { style: { paddingLeft: 0, listStyle: "none" } },             React.createElement("li", { key: 0, style: { marginBottom: 6, color: C.green, fontSize: 13 } }, "✓ Endpoints REST"),
            React.createElement("li", { key: 1, style: { marginBottom: 6, color: C.green, fontSize: 13 } }, "✓ Authentification JWT"),
            React.createElement("li", { key: 2, style: { marginBottom: 6, color: C.green, fontSize: 13 } }, "✓ Webhooks (partiel)"))
      ),
      React.createElement("div", { style: { ...cs } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 } },
          React.createElement(Wrench, { size: 16 }), "Reste à connecter"
        ),
        React.createElement("p", { style: { fontSize: 13, color: C.t2, lineHeight: 1.6 } }, "Les endpoints API existent. La console développeur est à créer.")
      )
    ),
    React.createElement("div", { style: { ...cs, borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" } },
      React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: C.purple, marginBottom: 8 } }, "🎯 Prochaine action"),
      React.createElement("p", { style: { fontSize: 13, color: C.t2, lineHeight: 1.7, marginBottom: 12 } }, "Créer la console développeur, générer la documentation OpenAPI, activer les webhooks."),
      React.createElement("button", { onClick: () => n("/parametres"), style: { padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", color: C.purple, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(ExternalLink, { size: 14 }), "Aller aux paramètres"
      )
    ),
    React.createElement("div", { style: { marginTop: 32, padding: "16px 20px", borderRadius: 12, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" } },
      React.createElement("p", { style: { fontSize: 14, color: "#6EE7B7", lineHeight: 1.6, margin: 0 } },
        React.createElement("strong", null, "💡 Bénéfice courtier :"), " COURTIA n'est pas une île. Connectez-le à votre site, votre compta, votre signature."
      )
    )
  )
}
