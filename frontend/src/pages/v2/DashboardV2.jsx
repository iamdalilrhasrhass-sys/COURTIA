import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, ClipboardList, TrendingUp, AlertTriangle, Calendar, Bell, Zap, ArrowRight, Sparkles } from 'lucide-react';
import {
  AuroraPageHeader,
  AuroraStat,
  AuroraCard,
  AuroraBadge,
  AuroraSkeleton,
  AuroraButton,
  AuroraSectionTitle,
  useToast,
} from '../../components/aurora';

const mockSignals = [
  { id: 1, type: 'hamon', title: 'Loi Hamon - Résiliation possible', description: 'Client Dupont Marie - Contrat auto éligible résiliation', priority: 'high', value: 1200 },
  { id: 2, type: 'chatel', title: 'Échéance Chatel J-45', description: 'Envoi courrier obligatoire pour 12 contrats', priority: 'medium', value: 8500 },
  { id: 3, type: 'silence', title: 'Client silencieux détecté', description: 'Martin Jean - Aucun contact depuis 8 mois', priority: 'low', value: 2300 },
];

const mockSuggestions = [
  { id: 1, icon: Bell, label: 'Envoyer rappels Chatel', count: 12 },
  { id: 2, icon: Users, label: 'Relancer clients silencieux', count: 8 },
  { id: 3, icon: Sparkles, label: 'Proposer multi-équipement', count: 5 },
];

const priorityColors = { high: 'rose', medium: 'amber', low: 'cyan' };
const priorityLabels = { high: 'Urgent', medium: 'Important', low: 'Info' };

const formatDate = () => {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export function DashboardV2() {
  const [stats, setStats] = useState({ clients: null, contracts: null, quotes: null, opportunities: null });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchStats = async () => {
      try {
        const endpoints = [
          { key: 'clients', url: '/api/clients/count', fallback: 124 },
          { key: 'contracts', url: '/api/contracts/count', fallback: 312 },
          { key: 'quotes', url: '/api/quotes/count', fallback: 42 },
          { key: 'opportunities', url: '/api/opportunities/count', fallback: 12 },
        ];

        const results = await Promise.all(
          endpoints.map(async (ep) => {
            try {
              const res = await fetch(ep.url, { headers, signal: controller.signal });
              if (!res.ok) throw new Error();
              const data = await res.json();
              return { [ep.key]: data.count ?? ep.fallback };
            } catch {
              return { [ep.key]: ep.fallback };
            }
          })
        );

        setStats(results.reduce((acc, r) => ({ ...acc, ...r }), {}));
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast('Erreur lors du chargement des statistiques', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    return () => controller.abort();
  }, [showToast]);

  const handleSuggestionClick = (suggestion) => {
    showToast(`Action "${suggestion.label}" lancée`, 'info');
  };

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title="Tableau de bord"
        subtitle={formatDate()}
        actions={
          <AuroraButton variant="primary" icon={Calendar}>
            Aujourd'hui
          </AuroraButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--aurora-space-4)', marginBottom: 'var(--aurora-space-6)' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <AuroraSkeleton key={i} height={120} />
          ))
        ) : (
          <>
            <AuroraStat value={stats.clients} label="Clients" trend={5.2} icon={Users} />
            <AuroraStat value={stats.contracts} label="Contrats" trend={3.8} icon={FileText} />
            <AuroraStat value={stats.quotes} label="Devis en cours" trend={-2.1} icon={ClipboardList} />
            <AuroraStat value={stats.opportunities} label="Opportunités" trend={12.5} icon={TrendingUp} />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--aurora-space-6)' }}>
        <div>
          <AuroraSectionTitle title="Morning Brief ARK Watch" subtitle="Signaux prioritaires détectés par l'IA" />
          <AuroraCard style={{ padding: 0, overflow: 'hidden' }}>
            {mockSignals.map((signal, index) => (
              <motion.div
                key={signal.id}
                style={{
                  padding: 'var(--aurora-space-4)',
                  borderBottom: index < mockSignals.length - 1 ? '1px solid var(--aurora-border-soft)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--aurora-space-3)',
                  cursor: 'pointer',
                }}
                whileHover={{ backgroundColor: 'var(--aurora-bg-surface-hover)' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 'var(--aurora-radius-md)', backgroundColor: 'var(--aurora-bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} style={{ color: `var(--aurora-${priorityColors[signal.priority]})` }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-2)', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--aurora-text-primary)' }}>{signal.title}</span>
                    <AuroraBadge variant={priorityColors[signal.priority]} size="sm">{priorityLabels[signal.priority]}</AuroraBadge>
                  </div>
                  <p style={{ margin: 0, fontSize: 'var(--aurora-text-sm)', color: 'var(--aurora-text-muted)' }}>{signal.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--aurora-emerald)' }}>{signal.value.toLocaleString('fr-FR')} €</div>
                  <div style={{ fontSize: 'var(--aurora-text-xs)', color: 'var(--aurora-text-muted)' }}>valeur estimée</div>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--aurora-text-muted)' }} />
              </motion.div>
            ))}
          </AuroraCard>
        </div>

        <div>
          <AuroraSectionTitle title="Suggestions ARK" subtitle="Actions recommandées" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
            {mockSuggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <AuroraCard
                  style={{ padding: 'var(--aurora-space-3)', cursor: 'pointer' }}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-3)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--aurora-radius-md)', background: 'var(--aurora-gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <suggestion.icon size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--aurora-text-primary)', fontSize: 'var(--aurora-text-sm)' }}>{suggestion.label}</div>
                    </div>
                    <AuroraBadge variant="violet" size="sm">{suggestion.count}</AuroraBadge>
                    <Zap size={16} style={{ color: 'var(--aurora-amber)' }} />
                  </div>
                </AuroraCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardV2;
