/**
 * ReportingV2 — LOT 20
 * Dashboard analytics personnalisable + exports
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, FileText, Zap, Download, Calendar, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  AuroraPageHeader,
  AuroraCard,
  AuroraStat,
  AuroraButton,
  AuroraSkeleton,
  AuroraSectionTitle,
  useToast,
} from '../../components/aurora';
// Montants dans la devise RÉELLE du cabinet (CHF en Suisse) et « — » pour une
// valeur absente : l'ancien formateur local de cette page forçait la devise euro
// et transformait « prime non renseignée » en « 0 » — deux faux chiffres.
import useDevise from '../../components/useDevise';
import { fmtMontant, fmtNombre, VALEUR_ABSENTE, localeCourante } from '../../lib/monnaie';

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '1y', label: '1 an' },
];

const COLORS = ['#6366f1', '#22d3ee', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ReportingV2() {
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [evolution, setEvolution] = useState([]);
  const [products, setProducts] = useState([]);
  const [arkPerf, setArkPerf] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [ovRes, evRes, prodRes, arkRes, foreRes] = await Promise.all([
        fetch(`/api/reporting/overview?period=${period}`, { headers }),
        fetch(`/api/reporting/clients/evolution?period=${period}`, { headers }),
        fetch('/api/reporting/products', { headers }),
        fetch(`/api/reporting/ark-performance?period=${period}`, { headers }),
        fetch('/api/reporting/revenue/forecast', { headers }),
      ]);

      if (ovRes.ok) {
        const corps = await ovRes.json();
        setOverview(corps.kpis);
        // L'API ANNONCE ses dépréciations (`kpis.quotes` → `kpis.devis`) : on les
        // remonte en console au lieu de lire silencieusement une clé condamnée.
        if (Array.isArray(corps.deprecations) && corps.deprecations.length) {
          console.info(
            '[ReportingV2] clés dépréciées :',
            corps.deprecations.map((d) => `${d.champ} → ${d.remplace_par}`).join(', ')
          );
        }
      }
      if (evRes.ok) setEvolution((await evRes.json()).evolution || []);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
      if (arkRes.ok) setArkPerf(await arkRes.json());
      if (foreRes.ok) setForecast(await foreRes.json());
    } catch (err) {
      showToast('Erreur de chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/reporting/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapport_courtia_${Date.now()}.${type}`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Export ${type.toUpperCase()} généré`, 'success');
      }
    } catch {
      showToast(`Erreur d'export ${type}`, 'error');
    }
  };

  // Devise du cabinet : l'écran se re-rend quand le profil réel arrive (sans ce
  // hook, un cabinet suisse restait affiché en euros jusqu'au rechargement).
  useDevise();

  // MONTANTS — `fmtMontant` (lib/monnaie.js) : devise du cabinet (CHF en Suisse),
  // et « — » quand la valeur est absente. Un montant non renseigné n'est pas un 0.
  const formatCurrency = (val) => fmtMontant(val, { maximumFractionDigits: 0 });

  // DEVIS — la clé juste est `devis`. Repli sur `quotes` le temps de la
  // dépréciation ANNONCÉE par l'API : face à un serveur antérieur, l'écran
  // affiche les mêmes chiffres au lieu de « 0 » (aucune divergence possible,
  // l'API garantit que les deux clés portent le même objet).
  const devis = overview?.devis ?? overview?.quotes ?? null;
  // Aucune mesure (aucun devis) ⇒ « — » ; le taux n'est jamais un 0 inventé.
  const formatTaux = (valeur) => (valeur === null || valeur === undefined ? VALEUR_ABSENTE : `${valeur} %`);

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title="Reporting Avancé"
        subtitle="Analysez la performance de votre portefeuille"
        icon={BarChart3}
        actions={
          <div style={{ display: 'flex', gap: 'var(--aurora-space-2)' }}>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: '8px 16px',
                background: 'var(--aurora-bg-secondary)',
                border: '1px solid var(--aurora-border)',
                borderRadius: 8,
                color: 'var(--aurora-text-primary)',
                fontSize: 14,
              }}
            >
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <AuroraButton variant="secondary" icon={Download} onClick={() => handleExport('csv')}>
              CSV
            </AuroraButton>
            <AuroraButton variant="primary" icon={Download} onClick={() => handleExport('pdf')}>
              PDF
            </AuroraButton>
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'grid', gap: 'var(--aurora-space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--aurora-space-4)' }}>
            {[1, 2, 3, 4].map(i => <AuroraSkeleton key={i} height={120} />)}
          </div>
          <AuroraSkeleton height={300} />
        </div>
      ) : (
        <>
          {/* KPIs principaux — CHAQUE CARTE DIT CE QU'ELLE COMPTE.
              « contrats actifs » et « contrats (toutes lignes) » sont deux
              notions distinctes (arbitrage du 20/09/2026, voir dashboard.js), et
              les devis se lisent sous la clé `devis` — jamais sous `quotes`, dont
              le nom disait « contrats » alors qu'il contenait des devis. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--aurora-space-4)', marginBottom: 'var(--aurora-space-6)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <AuroraStat
                label="Clients"
                value={fmtNombre(overview?.clients?.total ?? null)}
                icon={Users}
                color="indigo"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <AuroraStat
                label="Contrats actifs"
                value={fmtNombre(overview?.contracts?.actifs ?? null)}
                icon={FileText}
                color="violet"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <AuroraStat
                label="Contrats (toutes lignes, résiliés compris)"
                value={fmtNombre(overview?.contracts?.total ?? null)}
                icon={FileText}
                color="cyan"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <AuroraStat
                label="Prime annuelle des contrats actifs"
                value={formatCurrency(overview?.contracts?.totalValue)}
                icon={TrendingUp}
                color="cyan"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <AuroraStat
                label="Devis"
                value={fmtNombre(devis?.total ?? null)}
                icon={FileText}
                color="emerald"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <AuroraStat
                label="Taux de conversion devis (signés / devis)"
                value={formatTaux(devis?.conversionRate)}
                icon={FileText}
                color="emerald"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <AuroraStat
                label="Score ARK moyen"
                value={overview?.ark?.avgScore === null || overview?.ark?.avgScore === undefined
                  ? VALEUR_ABSENTE
                  : `${overview.ark.avgScore} / 100`}
                icon={Zap}
                color="violet"
              />
            </motion.div>
          </div>

          {/* Graphiques */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--aurora-space-4)', marginBottom: 'var(--aurora-space-6)' }}>
            {/* Évolution clients */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <AuroraCard style={{ padding: 'var(--aurora-space-5)' }}>
                <AuroraSectionTitle>Évolution du portefeuille</AuroraSectionTitle>
                <div style={{ height: 280, marginTop: 'var(--aurora-space-4)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolution}>
                      <defs>
                        <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString(localeCourante(), { day: '2-digit', month: 'short' })}
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={11}
                      />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString(localeCourante())}
                      />
                      <Area type="monotone" dataKey="cumulative" stroke="#6366f1" fill="url(#colorClients)" strokeWidth={2} name="Clients totaux" />
                      <Line type="monotone" dataKey="new" stroke="#22d3ee" strokeWidth={2} dot={false} name="Nouveaux" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </AuroraCard>
            </motion.div>

            {/* Répartition produits */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <AuroraCard style={{ padding: 'var(--aurora-space-5)' }}>
                <AuroraSectionTitle>Répartition par produit</AuroraSectionTitle>
                <div style={{ height: 280, marginTop: 'var(--aurora-space-4)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={products}
                        dataKey="totalPremium"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {products.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        formatter={(val) => formatCurrency(val)}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </AuroraCard>
            </motion.div>
          </div>

          {/* Prévisions et ARK Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--aurora-space-4)' }}>
            {/* Prévisions CA */}
            {forecast && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <AuroraCard style={{ padding: 'var(--aurora-space-5)' }}>
                  <AuroraSectionTitle icon={TrendingUp}>Prévisions CA</AuroraSectionTitle>
                  <div style={{ marginTop: 'var(--aurora-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>ARR actuel</span>
                      <span style={{ fontWeight: 700, color: 'var(--aurora-text-primary)' }}>{formatCurrency(forecast.currentARR)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>ARR projeté</span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(forecast.projectedARR)}</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--aurora-border)', margin: 'var(--aurora-space-2) 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>Renouvellements 30j</span>
                      <span style={{ color: '#f59e0b' }}>{formatCurrency(forecast.renewals?.next30d)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>Pipeline pondéré</span>
                      <span style={{ color: '#6366f1' }}>{formatCurrency(forecast.pipeline?.weightedValue)}</span>
                    </div>
                  </div>
                </AuroraCard>
              </motion.div>
            )}

            {/* Performance ARK */}
            {arkPerf && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <AuroraCard style={{ padding: 'var(--aurora-space-5)' }}>
                  <AuroraSectionTitle icon={Zap}>Performance ARK</AuroraSectionTitle>
                  <div style={{ marginTop: 'var(--aurora-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>Signaux générés</span>
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>{arkPerf.signals?.total || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--aurora-text-secondary)' }}>Actions complétées</span>
                      <span style={{ color: '#10b981' }}>{formatTaux(arkPerf.actions?.completionRate)}</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--aurora-border)', margin: 'var(--aurora-space-2) 0' }} />
                    <div style={{ fontSize: 12, color: 'var(--aurora-text-tertiary)' }}>Distribution des scores clients</div>
                    <div style={{ display: 'flex', gap: 'var(--aurora-space-2)' }}>
                      <div style={{ flex: arkPerf.scores?.distribution?.excellent || 1, background: '#10b981', height: 8, borderRadius: 4 }} />
                      <div style={{ flex: arkPerf.scores?.distribution?.good || 1, background: '#f59e0b', height: 8, borderRadius: 4 }} />
                      <div style={{ flex: arkPerf.scores?.distribution?.needsAttention || 1, background: '#f43f5e', height: 8, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--aurora-text-tertiary)' }}>
                      <span>🟢 Excellent ({arkPerf.scores?.distribution?.excellent || 0})</span>
                      <span>🟡 Bon ({arkPerf.scores?.distribution?.good || 0})</span>
                      <span>🔴 À suivre ({arkPerf.scores?.distribution?.needsAttention || 0})</span>
                    </div>
                  </div>
                </AuroraCard>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}