import { useState } from 'react'
import {
  User, Mail, Phone, MapPin, Building, AlertTriangle, Calendar, Sparkles, Shield,
  FileText, Clock, Target, TrendingUp, Euro, Activity, Star, ChevronRight,
  Send, CheckCircle, RotateCw, Layers, Zap, BarChart2, Search, Plus, Eye, X,
  ArrowUp, ArrowDown, MessageSquare, Users, Briefcase, Gauge, ChevronDown,
  Gem, Heart, Globe, Bell, Info, Download
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// AURORA DARK TOKENS
// ═══════════════════════════════════════════════════════════════
const T = {
  bg: '#050510', cardBg: 'rgba(255,255,255,0.03)', cardBorder: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.05)', text: '#FFFFFF', textSecondary: '#9CA3AF',
  textMuted: '#6B7280', accent: '#5B4DF5', accentBg: 'rgba(91,77,245,0.08)',
  accentBorder: 'rgba(91,77,245,0.20)', ark: '#8B5CF6', arkBg: 'rgba(139,92,246,0.06)',
  arkBorder: 'rgba(139,92,246,0.15)', success: '#22C55E', successBg: 'rgba(34,197,94,0.08)',
  warning: '#F59E0B', warningBg: 'rgba(245,158,11,0.08)', danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.08)',
}

const fmtEur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))

// ═══════════════════════════════════════════════════════════════
// DEMO DATA — same as real app pages
// ═══════════════════════════════════════════════════════════════

const DEMO_CLIENT = {
  id: 'demo-martin-conseil', nom: 'Martin Conseil', email: 'contact@martinconseil.fr',
  tel: '06 23 45 67 89', adresse: '14 rue de la République, 69002 Lyon', segment: 'Professionnel',
  anciennete: '2023-03-15', scoreRisque: 72, scorePotentiel: 85, arkAction: 'Relancer RC Pro',
  arkReason: 'Échéance dans 21 jours, contrat à 2 800 €. Préparer renouvellement avec option Prévoyance TNS.',
  contrats: [
    { id: 1, produit: 'RC Pro', compagnie: 'Aurora Assurances', prime: 2800, effet: '2025-06-15', echeance: '2026-06-15', statut: 'actif' },
    { id: 2, produit: 'Prévoyance TNS', compagnie: 'Novalia Courtage', prime: 1200, effet: '2025-09-01', echeance: '2026-09-01', statut: 'actif' },
    { id: 3, produit: 'MRH Bureau', compagnie: 'Helios Protection', prime: 650, effet: '2026-01-01', echeance: '2027-01-01', statut: 'actif' },
    { id: 4, produit: 'Cyber PME', compagnie: 'Serenis Risk', prime: 1500, effet: '2025-11-15', echeance: '2026-11-15', statut: 'actif' },
  ],
  devis: [
    { id: 1, produit: 'Flotte Auto 3VL', montant: 4200, statut: 'Envoyé', date: '2026-05-02' },
    { id: 2, produit: 'Décennale', montant: 3500, statut: 'En cours', date: '2026-04-28' },
  ],
  historique: [
    { date: '2026-05-04', action: 'Appel relance Devis Flotte Auto' },
    { date: '2026-04-20', action: 'Email renouvellement RC Pro envoyé' },
    { date: '2026-03-15', action: 'Rendez-vous annuel de revue' },
    { date: '2026-01-10', action: 'Nouveau contrat MRH Bureau' },
    { date: '2025-11-15', action: 'Nouveau contrat Cyber PME' },
  ],
}

const DEMO_RELANCES = [
  { client: 'Karim B.', raison: 'Devis Auto #247 sans réponse', urgence: 'Haute', potentiel: 840, produit: 'Auto', ark: 'Devis envoyé il y a 7 jours. Client déjà actif Habitation. Probabilité élevée.' },
  { client: 'Martin Conseil', raison: 'Échéance RC Pro dans 21 jours', urgence: 'Haute', potentiel: 2800, produit: 'RC Pro', ark: 'Échéance imminente. Renouvellement avec option Prévoyance TNS.' },
  { client: 'Dupont SAS', raison: 'Devis PJ envoyé sans réponse', urgence: 'Moyenne', potentiel: 2100, produit: 'PJ', ark: 'Devis PJ 9 jours. Client RC Pro actif. Multi-équipement favorable.' },
  { client: 'Auto Évolution 89', raison: 'Flotte Auto : échéance dépassée', urgence: 'Haute', potentiel: 4200, produit: 'Flotte Auto', ark: 'Échéance dépassée de 26 jours. Renouvellement urgent.' },
  { client: 'Petit Philippe', raison: 'Devis Auto sans réponse', urgence: 'Haute', potentiel: 1100, produit: 'Auto', ark: 'Relancer par téléphone avant expiration du devis.' },
  { client: 'Leroy Marie', raison: 'Cliente silencieuse', urgence: 'Moyenne', potentiel: 380, produit: 'Habitation', ark: 'Score risque 80%. Contacter pour vérifier satisfaction.' },
  { client: 'BatiSens Pro', raison: 'Devis Prévoyance accepté', urgence: 'Moyenne', potentiel: 950, produit: 'Prévoyance', ark: "Transformer en contrat avant perte d'intérêt." },
  { client: 'Sophie L.', raison: 'Opportunité Prévoyance', urgence: 'Moyenne', potentiel: 520, produit: 'Prévoyance', ark: 'Cliente Santé active sans Prévoyance. Probabilité 70%.' },
]

const DEMO_OPPORTUNITES = [
  { client: 'Martin Conseil', produit: 'Flotte Auto 3VL', potentiel: 4200, confiance: 85, raison: 'RC Pro actif + croissance PME, multi-véhicule détecté' },
  { client: 'Karim B.', produit: 'Prévoyance Individuelle', potentiel: 520, confiance: 70, raison: 'Client Habitation actif, pas de Prévoyance. Déménagement récent.' },
  { client: 'Sophie L.', produit: 'MRH Pro', potentiel: 380, confiance: 75, raison: 'Cliente Santé active, MRH non couvert. Nouveau cabinet libéral.' },
  { client: 'Dupont SAS', produit: 'Cyber PME', potentiel: 1500, confiance: 60, raison: 'RC Pro + PJ actifs. Cyber non couvert. Sensible aux risques numériques.' },
  { client: 'Groupe Ardent', produit: 'Décennale', potentiel: 3500, confiance: 45, raison: "Chiffre d'affaires en croissance. Décennale à revoir avec option RC." },
  { client: 'SCP Dubois', produit: 'Prévoyance Collective', potentiel: 2800, confiance: 55, raison: 'Contrat Décennale + PJ. 4 collaborateurs. Prévoyance collective absente.' },
  { client: 'BatiSens Pro', produit: 'Flotte + Cyber', potentiel: 5800, confiance: 40, raison: 'Gros compte RC Pro. Flotte Auto non couverte. Cyber obligatoire prochainement.' },
  { client: 'Cabinet Moreau', produit: 'Assurance Homme Clé', potentiel: 1800, confiance: 50, raison: 'Dirigeant unique. PJ + Prévoyance actifs. Homme clé non couvert.' },
]

const DEMO_DOCUMENTS = [
  { client: 'Martin Conseil', document: 'Attestation RC Pro 2026', type: 'Attestation', statut: 'OK', date: '2026-01-15' },
  { client: 'Martin Conseil', document: 'Contrat Prévoyance TNS', type: 'Contrat', statut: 'OK', date: '2025-09-01' },
  { client: 'Dupont SAS', document: 'Fiche Information Contrat PJ', type: 'FIC', statut: 'OK', date: '2026-02-10' },
  { client: 'Auto Évolution 89', document: 'Attestation Flotte Auto', type: 'Attestation', statut: 'À vérifier', date: '2025-11-30' },
  { client: 'Karim B.', document: 'FIC Auto', type: 'FIC', statut: 'OK', date: '2026-03-05' },
  { client: 'SCP Dubois', document: 'Attestation Décennale', type: 'Attestation', statut: 'OK', date: '2025-06-22' },
  { client: 'Groupe Ardent', document: 'Contrat Cyber PME', type: 'Contrat', statut: 'Manquant', date: '—' },
  { client: 'Cabinet Moreau', document: 'Attestation PJ', type: 'Attestation', statut: 'À vérifier', date: '2026-01-10' },
  { client: 'Sophie L.', document: 'FIC Santé', type: 'FIC', statut: 'OK', date: '2026-04-01' },
  { client: 'Leroy Marie', document: 'Attestation Habitation', type: 'Attestation', statut: 'OK', date: '2025-12-20' },
]

const STATUT_COLORS = { 'OK': T.success, 'À vérifier': T.warning, 'Manquant': T.danger }
const STATUT_BG = { 'OK': T.successBg, 'À vérifier': T.warningBg, 'Manquant': T.dangerBg }
const URGENCE_COLORS = { 'Haute': T.danger, 'Moyenne': T.warning, 'Basse': T.success }

const SIDEBAR_UNIVERS = [
  { icon: Gauge, label: 'Pilotage', open: true, links: ['Cockpit', 'Morning Brief', 'Rapports'] },
  { icon: Users, label: 'Portefeuille', open: false, links: ['Clients', 'Contrats', 'Devis', 'Documents'] },
  { icon: Activity, label: 'Actions', open: false, links: ['Tâches', 'Relances', 'Opportunités'] },
  { icon: TrendingUp, label: 'Acquisition', open: false, links: ['Prospection'] },
  { icon: Sparkles, label: 'ARK IA', open: false, links: ['Assistant ARK'] },
  { icon: Building, label: 'Cabinet', open: false, links: ['Paramètres', 'Partenaires', 'Abonnement'] },
  { icon: Globe, label: 'Ressources', open: false, links: ['Academy'] },
]

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Badge({ color, bg, children }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 9999 }}>{children}</span>
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return <div style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      {Icon && <Icon size={22} color={T.ark} />}
      <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>{title}</h2>
    </div>
    {subtitle && <p style={{ margin: 0, color: T.textSecondary, fontSize: 13, paddingLeft: Icon ? 32 : 0 }}>{subtitle}</p>}
  </div>
}

function KpiCard({ label, value, icon: Icon, color, trend }) {
  return <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: 14, flex: 1, minWidth: 150 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: T.textMuted }}>{label}</span>
      {Icon && <Icon size={16} color={color || T.ark} />}
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{value}</div>
    {trend && <span style={{ fontSize: 11, color: color || T.textSecondary }}>{trend}</span>}
  </div>
}

function ArkPanel({ message }) {
  return <div style={{ background: T.arkBg, border: '1px solid ' + T.arkBorder, borderRadius: 12, padding: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <Sparkles size={16} color={T.ark} />
      <span style={{ fontSize: 12, fontWeight: 700, color: T.ark }}>ARK RECOMMANDE</span>
    </div>
    <p style={{ margin: 0, fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>{message}</p>
  </div>
}

// ═══════════════════════════════════════════════════════════════
// PAGES AS SECTIONS
// ═══════════════════════════════════════════════════════════════

function FicheClientSection() {
  return <div style={{ minHeight: '100vh', background: T.bg, padding: '48px 40px' }}>
    <SectionTitle icon={User} title="Fiche client — Martin Conseil" subtitle="Score ARK : Risque 72 • Potentiel 85/100" />
    
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {/* Colonne gauche */}
      <div style={{ flex: 1, minWidth: 340 }}>
        {/* Infos client */}
        <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 12 }}>{DEMO_CLIENT.nom}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow icon={Mail} text={DEMO_CLIENT.email} />
            <InfoRow icon={Phone} text={DEMO_CLIENT.tel} />
            <InfoRow icon={MapPin} text={DEMO_CLIENT.adresse} />
            <InfoRow icon={Building} text={'Segment ' + DEMO_CLIENT.segment + ' • Client depuis ' + DEMO_CLIENT.anciennete} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid ' + T.cardBorder }}>
            <Badge color={T.warning} bg={T.warningBg}>Risque {DEMO_CLIENT.scoreRisque}/100</Badge>
            <Badge color={T.success} bg={T.successBg}>Potentiel {DEMO_CLIENT.scorePotentiel}/100</Badge>
          </div>
        </div>

        {/* Contrats */}
        <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color={T.ark} /> Contrats ({DEMO_CLIENT.contrats.length})
          </div>
          {DEMO_CLIENT.contrats.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid ' + T.cardBorder }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.produit}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{c.compagnie}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtEur(c.prime)}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>Éch. {new Date(c.echeance).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Devis */}
        <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} color={T.accent} /> Devis en cours ({DEMO_CLIENT.devis.length})
          </div>
          {DEMO_CLIENT.devis.map((d) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid ' + T.cardBorder }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{d.produit}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{d.statut} • {d.date}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>{fmtEur(d.montant)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Colonne droite — ARK */}
      <div style={{ flex: 1, minWidth: 340 }}>
        <ArkPanel message={DEMO_CLIENT.arkReason} />
        
        <div style={{ background: T.cardBg, border: '1px solid ' + T.arkBorder, borderRadius: 14, padding: 20, marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color={T.warning} /> Historique récent
          </div>
          {DEMO_CLIENT.historique.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid ' + T.cardBorder }}>
              <span style={{ fontSize: 11, color: T.textMuted, minWidth: 85 }}>{h.date}</span>
              <span style={{ fontSize: 12, color: T.textSecondary }}>{h.action}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button style={{ flex: 1, padding: '10px 16px', background: T.accent, color: T.text, border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Send size={14} /> Relancer
          </button>
          <button style={{ flex: 1, padding: '10px 16px', background: 'rgba(255,255,255,0.05)', color: T.text, border: '1px solid ' + T.cardBorder, borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <FileText size={14} /> Nouveau devis
          </button>
        </div>
      </div>
    </div>
  </div>
}

function InfoRow({ icon: Icon, text }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <Icon size={14} color={T.textMuted} />
    <span style={{ fontSize: 13, color: T.textSecondary }}>{text}</span>
  </div>
}

function RelancesSection() {
  return <div style={{ minHeight: '100vh', background: T.bg, padding: '48px 40px' }}>
    <SectionTitle icon={Send} title="Relances prioritaires" subtitle="18 relances • 5 aujourd'hui • ARK priorise vos appels" />
    
    <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
      <KpiCard label="Total" value="18" icon={Layers} />
      <KpiCard label="Aujourd'hui" value="5" icon={Clock} color={T.danger} />
      <KpiCard label="Urgentes" value="4" icon={AlertTriangle} color={T.warning} />
      <KpiCard label="Potentiel" value={fmtEur(14690)} icon={Euro} color={T.success} />
      <KpiCard label="Action ARK" value="Contacter" icon={Sparkles} color={T.ark} />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 900 }}>
      {DEMO_RELANCES.slice(0, 8).map((r, i) => (
        <div key={i} style={{ background: i < 2 ? 'rgba(139,92,246,0.04)' : T.cardBg, border: '1px solid ' + (i < 2 ? T.arkBorder : T.cardBorder), borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.client}</span>
                <Badge color={URGENCE_COLORS[r.urgence]} bg={URGENCE_COLORS[r.urgence] === T.danger ? T.dangerBg : T.warningBg}>{r.urgence}</Badge>
                <Badge color={T.accent} bg={T.accentBg}>{r.produit}</Badge>
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{r.raison}</div>
              <div style={{ fontSize: 11, color: T.ark, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={11} /> {r.ark}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fmtEur(r.potentiel)}</div>
              <button style={{ marginTop: 6, padding: '6px 12px', background: T.accent, color: T.text, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} /> Relancer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
}

function OpportunitesSection() {
  return <div style={{ minHeight: '100vh', background: T.bg, padding: '48px 40px' }}>
    <SectionTitle icon={TrendingUp} title="Opportunités commerciales" subtitle="12 détectées par ARK • 24 500 € de potentiel identifié" />
    
    <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
      <KpiCard label="Détectées" value="12" icon={Target} />
      <KpiCard label="Potentiel total" value={fmtEur(24500)} icon={Euro} color={T.success} />
      <KpiCard label="Confiance moyenne" value="60%" icon={Gauge} color={T.warning} />
      <KpiCard label="Action ARK" value="Prioriser" icon={Sparkles} color={T.ark} />
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 900 }}>
      {DEMO_OPPORTUNITES.map((o, i) => (
        <div key={i} style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{o.client}</span>
                <Badge color={T.ark} bg={T.arkBg}>{o.produit}</Badge>
                <Badge color={T.success} bg={T.successBg}>+{fmtEur(o.potentiel)}</Badge>
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{o.raison}</div>
              {/* Confiance bar */}
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ height: 6, background: T.cardBorder, borderRadius: 3, flex: 1, overflow: 'hidden' }}>
                  <div style={{ height: 6, width: o.confiance + '%', background: o.confiance > 60 ? T.success : T.warning, borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: o.confiance > 60 ? T.success : T.warning }}>Confiance {o.confiance}%</span>
              </div>
            </div>
            <button style={{ padding: '6px 12px', background: T.arkBg, color: T.ark, border: '1px solid ' + T.arkBorder, borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Target size={12} /> Détails
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
}

function DocumentsSection() {
  return <div style={{ minHeight: '100vh', background: T.bg, padding: '48px 40px' }}>
    <SectionTitle icon={FileText} title="Documents centralisés" subtitle="186 documents • 12 visibles • 2 à vérifier • 1 manquant" />
    
    <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
      <KpiCard label="Total" value="186" icon={FileText} />
      <KpiCard label="OK" value="7" icon={CheckCircle} color={T.success} />
      <KpiCard label="À vérifier" value="2" icon={RotateCw} color={T.warning} />
      <KpiCard label="Manquants" value="1" icon={AlertTriangle} color={T.danger} />
    </div>

    <div style={{ background: T.cardBg, border: '1px solid ' + T.cardBorder, borderRadius: 14, overflow: 'hidden', maxWidth: 900 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid ' + T.cardBorder }}>
            <th style={thStyle}>Client</th>
            <th style={thStyle}>Document</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Statut</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {DEMO_DOCUMENTS.slice(0, 8).map((d, i) => (
            <tr key={i} style={{ borderBottom: '1px solid ' + T.cardBorder }}>
              <td style={tdStyle}>{d.client}</td>
              <td style={tdStyle}>{d.document}</td>
              <td style={{ ...tdStyle, color: T.ark }}>{d.type}</td>
              <td style={{ ...tdStyle, color: T.textMuted }}>{d.date}</td>
              <td style={tdStyle}>
                <Badge color={STATUT_COLORS[d.statut]} bg={STATUT_BG[d.statut]}>{d.statut}</Badge>
              </td>
              <td style={tdStyle}>
                <button style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', color: T.textSecondary, border: '1px solid ' + T.cardBorder, borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                  <Eye size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <ArkPanel message="Document 'Contrat Cyber PME' manquant pour Groupe Ardent. Contacter le client pour mise en conformité. Document 'Attestation PJ' marqué À vérifier pour Cabinet Moreau." />
  </div>
}

const thStyle = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase' }
const tdStyle = { padding: '10px 14px', fontSize: 12, color: T.textSecondary }

function SidebarSection() {
  return <div style={{ minHeight: '100vh', background: T.bg, padding: '48px 40px', display: 'flex' }}>
    {/* Sidebar */}
    <div style={{ width: 280, background: 'rgba(10,10,30,0.95)', borderRight: '1px solid ' + T.cardBorder, borderRadius: '16px 0 0 16px', padding: '24px 0', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid ' + T.cardBorder, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: -1 }}>
          <span style={{ color: T.ark }}>COUR</span>TIA
        </div>
      </div>
      {/* Univers */}
      {SIDEBAR_UNIVERS.map((u, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: 'pointer', color: u.open ? T.text : T.textSecondary, fontWeight: 600, fontSize: 13 }}>
            <u.icon size={17} color={u.open ? T.ark : T.textMuted} />
            <span style={{ flex: 1 }}>{u.label}</span>
            <ChevronDown size={14} style={{ transform: u.open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          {u.open && u.links.map((link, j) => (
            <div key={j} style={{ padding: '7px 20px 7px 52px', fontSize: 12, color: j === 0 ? T.ark : T.textMuted, cursor: 'pointer', background: j === 0 ? T.arkBg : 'transparent' }}>
              {link}
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Main content zone */}
    <div style={{ flex: 1, background: T.cardBg, borderRadius: '0 16px 16px 0', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <Sparkles size={48} color={T.ark} style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 18, fontWeight: 600, color: T.text }}>7 univers • 28 pages</div>
      <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 4 }}>Sidebar accordéon premium — Route active mise en évidence</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {SIDEBAR_UNIVERS.map((u, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? T.ark : T.cardBorder }} />
        ))}
      </div>
    </div>
  </div>
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ShowcaseVideo() {
  const [section, setSection] = useState(0)
  const sections = [
    { label: 'Fiche Client', component: <FicheClientSection /> },
    { label: 'Relances', component: <RelancesSection /> },
    { label: 'Opportunités', component: <OpportunitesSection /> },
    { label: 'Documents', component: <DocumentsSection /> },
    { label: 'Sidebar', component: <SidebarSection /> },
  ]

  return <div style={{ background: T.bg, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
    {/* Mini nav */}
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(5,5,16,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + T.cardBorder, padding: '10px 20px', display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
      {sections.map((s, i) => (
        <button
          key={i}
          onClick={() => {
            setSection(i)
            document.getElementById('section-' + i)?.scrollIntoView({ behavior: 'smooth' })
          }}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: section === i ? T.ark : 'rgba(255,255,255,0.04)',
            color: section === i ? T.text : T.textMuted,
          }}
        >
          {s.label}
        </button>
      ))}
    </div>

    <div style={{ paddingTop: 46 }}>
      {sections.map((s, i) => (
        <div key={i} id={'section-' + i} style={{ scrollSnapAlign: 'start' }}>
          {s.component}
        </div>
      ))}
    </div>
  </div>
}
