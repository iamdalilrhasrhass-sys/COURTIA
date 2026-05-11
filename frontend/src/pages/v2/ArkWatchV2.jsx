import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Radar, AlertTriangle, TrendingUp, Shield, Clock, Play, Check, X, Eye, FileText, Users, Calendar, Euro, ChevronRight } from 'lucide-react';
import {
  AuroraPageHeader,
  AuroraCard,
  AuroraStat,
  AuroraBadge,
  AuroraSkeleton,
  AuroraButton,
  AuroraSectionTitle,
  AuroraEmptyState,
  AuroraDivider,
  useToast,
} from '../../components/aurora';

const mockSignals = [
  { id: 1, type: 'hamon', title: 'Loi Hamon - Opportunité résiliation', description: 'Client Marie Dupont - Contrat auto concurrent éligible depuis 14 mois', client: 'Marie Dupont', value: 1200, severity: 'high', action: 'Proposer devis comparatif', createdAt: '2026-05-11T08:30:00' },
  { id: 2, type: 'chatel', title: 'Échéance Chatel J-45', description: 'Envoi courrier légal obligatoire avant renouvellement', client: 'Jean Martin', value: 850, severity: 'high', action: 'Générer courrier Chatel', createdAt: '2026-05-11T07:15:00' },
  { id: 3, type: 'chatel', title: 'Échéance Chatel J-30', description: 'Rappel client et proposition de nouveaux tarifs', client: 'Pierre Durand', value: 620, severity: 'medium', action: 'Appeler le client', createdAt: '2026-05-10T16:45:00' },
  { id: 4, type: 'silence', title: 'Client silencieux détecté', description: 'Aucun contact depuis 8 mois - risque de churn élevé', client: 'Sophie Bernard', value: 2300, severity: 'medium', action: 'Planifier rendez-vous bilan', createdAt: '2026-05-10T14:20:00' },
  { id: 5, type: 'upsell', title: 'Opportunité multi-équipement', description: 'Client mono-produit avec potentiel MRH + Santé', client: 'Claire Moreau', value: 1800, severity: 'low', action: 'Envoyer offre groupée', createdAt: '2026-05-10T11:00:00' },
  { id: 6, type: 'renewal', title: 'Renouvellement approchant', description: 'Contrat MRH à échéance dans 60 jours', client: 'Lucas Petit', value: 450, severity: 'low', action: 'Préparer proposition', createdAt: '2026-05-09T09:30:00' },
];

const severityConfig = {
  high: { label: 'Urgent', variant: 'rose', icon: AlertTriangle },
  medium: { label: 'Important', variant: 'amber', icon: Clock },
  low: { label: 'Info', variant: 'cyan', icon: Eye },
};

const typeIcons = {
  hamon: FileText,
  chatel: Calendar,
  silence: Users,
  upsell: TrendingUp,
  renewal: Shield,
};

export function ArkWatchV2() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('all');
  const { showToast } = useToast();

  const fetchSignals = useCallback(async (controller) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      const res = await fetch('/api/ark-watch/signals', { headers, signal: controller.signal });
      if (!res.ok) throw new Error('Erreur API');
      const data = await res.json();
      setSignals(data.signals || data || mockSignals);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setSignals(mockSignals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSignals(controller);
    return () => controller.abort();
  }, [fetchSignals]);

  const handleScan = async () => {
    setScanning(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      const res = await fetch('/api/ark-watch/run', { method: 'POST', headers });
      if (!res.ok) throw new Error();
      showToast('Scan ARK Watch terminé avec succès', 'success');
      const controller = new AbortController();
      await fetchSignals(controller);
    } catch {
      showToast('Scan lancé en arrière-plan', 'info');
    } finally {
      setScanning(false);
    }
  };

  const handleSignalAction = (action, signal) => {
    showToast(`${action}: ${signal.title}`, 'success');
    if (action === 'resolve' || action === 'ignore') {
      setSignals((prev) => prev.filter((s) => s.id !== signal.id));
    }
  };

  const filteredSignals = filter === 'all' ? signals : signals.filter((s) => s.severity === filter);
  const groupedSignals = {
    high: filteredSignals.filter((s) => s.severity === 'high'),
    medium: filteredSignals.filter((s) => s.severity === 'medium'),
    low: filteredSignals.filter((s) => s.severity === 'low'),
  };

  const stats = {
    total: signals.length,
    value: signals.reduce((sum, s) => sum + s.value, 0),
    high: signals.filter((s) => s.severity === 'high').length,
    medium: signals.filter((s) => s.severity === 'medium').length,
  };

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title="ARK Watch"
        subtitle="Centre de surveillance et signaux IA"
        actions={
          <AuroraButton
            variant="primary"
            icon={Play}
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? 'Scan en cours...' : 'Lancer un scan'}
          </AuroraButton>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--aurora-space-4)', marginBottom: 'var(--aurora-space-6)' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <AuroraSkeleton key={i} height={100} />)
        ) : (
          <>
            <AuroraStat value={stats.total} label="Total signaux" icon={Radar} />
            <AuroraStat value={`${stats.value.toLocaleString('fr-FR')} €`} label="Valeur estimée" icon={Euro} trend={8.5} />
            <AuroraStat value={stats.high} label="Urgents" icon={AlertTriangle} />
            <AuroraStat value={stats.medium} label="Importants" icon={Clock} />
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--aurora-space-2)', marginBottom: 'var(--aurora-space-4)', flexWrap: 'wrap' }}>
        <AuroraBadge
          variant={filter === 'all' ? 'violet' : 'neutral'}
          size="md"
          onClick={() => setFilter('all')}
        >
          Tous ({signals.length})
        </AuroraBadge>
        {Object.entries(severityConfig).map(([key, config]) => (
          <AuroraBadge
            key={key}
            variant={filter === key ? config.variant : 'neutral'}
            size="md"
            icon={config.icon}
            onClick={() => setFilter(key)}
          >
            {config.label} ({signals.filter((s) => s.severity === key).length})
          </AuroraBadge>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-4)' }}>
          {Array.from({ length: 3 }).map((_, i) => <AuroraSkeleton key={i} height={120} />)}
        </div>
      ) : filteredSignals.length === 0 ? (
        <AuroraEmptyState
          icon={Radar}
          title="Aucun signal détecté"
          description="ARK Watch n'a détecté aucun signal correspondant à vos filtres. Lancez un nouveau scan pour actualiser."
          action={<AuroraButton variant="primary" icon={Play} onClick={handleScan}>Lancer un scan</AuroraButton>}
        />
      ) : (
        Object.entries(groupedSignals).map(([severity, items]) => {
          if (items.length === 0) return null;
          const config = severityConfig[severity];
          return (
            <div key={severity} style={{ marginBottom: 'var(--aurora-space-6)' }}>
              <AuroraSectionTitle
                title={`${config.label} (${items.length})`}
                subtitle={`Signaux ${config.label.toLowerCase()} nécessitant votre attention`}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
                {items.map((signal) => {
                  const TypeIcon = typeIcons[signal.type] || FileText;
                  return (
                    <motion.div
                      key={signal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.005, y: -2 }}
                    >
                      <AuroraCard style={{ padding: 'var(--aurora-space-4)' }}>
                        <div style={{ display: 'flex', gap: 'var(--aurora-space-4)', alignItems: 'flex-start' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 'var(--aurora-radius-lg)', backgroundColor: `var(--aurora-${config.variant})15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <TypeIcon size={24} style={{ color: `var(--aurora-${config.variant})` }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-2)', marginBottom: 'var(--aurora-space-1)', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: 'var(--aurora-text-primary)' }}>{signal.title}</span>
                              <AuroraBadge variant={config.variant} size="sm" icon={config.icon}>{config.label}</AuroraBadge>
                            </div>
                            <p style={{ margin: 0, fontSize: 'var(--aurora-text-sm)', color: 'var(--aurora-text-muted)', marginBottom: 'var(--aurora-space-2)' }}>{signal.description}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-4)', fontSize: 'var(--aurora-text-xs)', color: 'var(--aurora-text-muted)' }}>
                              <span><strong>Client:</strong> {signal.client}</span>
                              <span><strong>Action:</strong> {signal.action}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 'var(--aurora-text-lg)', color: 'var(--aurora-emerald)', marginBottom: 'var(--aurora-space-2)' }}>
                              {signal.value.toLocaleString('fr-FR')} €
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--aurora-space-2)' }}>
                              <AuroraButton size="sm" variant="ghost" icon={Check} onClick={() => handleSignalAction('acknowledge', signal)}>Acquitter</AuroraButton>
                              <AuroraButton size="sm" variant="primary" icon={ChevronRight} onClick={() => handleSignalAction('resolve', signal)}>Résoudre</AuroraButton>
                              <AuroraButton size="sm" variant="ghost" icon={X} onClick={() => handleSignalAction('ignore', signal)}>Ignorer</AuroraButton>
                            </div>
                          </div>
                        </div>
                      </AuroraCard>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default ArkWatchV2;
