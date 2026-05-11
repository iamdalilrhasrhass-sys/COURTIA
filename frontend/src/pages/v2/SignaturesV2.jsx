/**
 * SignaturesV2 — LOT 20
 * Page de gestion des signatures électroniques (Yousign)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSignature, Clock, CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw, Send, Search, Filter, MoreHorizontal } from 'lucide-react';
import {
  AuroraPageHeader,
  AuroraCard,
  AuroraBadge,
  AuroraButton,
  AuroraSkeleton,
  AuroraEmptyState,
  useToast,
} from '../../components/aurora';

const STATUS_CONFIG = {
  sent_to_sign: { label: 'En attente', color: 'amber', icon: Clock },
  pending: { label: 'En attente', color: 'amber', icon: Clock },
  signed: { label: 'Signé', color: 'emerald', icon: CheckCircle2 },
  refused: { label: 'Refusé', color: 'rose', icon: XCircle },
  expired: { label: 'Expiré', color: 'gray', icon: AlertTriangle },
  cancelled: { label: 'Annulé', color: 'gray', icon: XCircle },
};

export default function SignaturesV2() {
  const [signatures, setSignatures] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [sigRes, statsRes] = await Promise.all([
        fetch(`/api/signatures${filter !== 'all' ? `?status=${filter}` : ''}`, { headers }),
        fetch('/api/signatures/stats', { headers }),
      ]);

      if (sigRes.ok) {
        const data = await sigRes.json();
        setSignatures(data.signatures || []);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleRemind = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/signatures/${id}/remind`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast('Relance envoyée', 'success');
      } else {
        throw new Error();
      }
    } catch {
      showToast('Erreur lors de la relance', 'error');
    }
  };

  const handleDownload = async (id, name) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/signatures/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name || 'document_signe.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      showToast('Erreur de téléchargement', 'error');
    }
  };

  const handleRefreshStatus = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/signatures/${id}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchData();
        showToast('Statut mis à jour', 'info');
      }
    } catch {
      showToast('Erreur de rafraîchissement', 'error');
    }
  };

  const filteredSignatures = signatures.filter(s =>
    search === '' ||
    s.signer_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.signer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader
        title="Signatures Électroniques"
        subtitle="Gérez vos demandes de signature Yousign"
        icon={FileSignature}
      />

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--aurora-space-4)', marginBottom: 'var(--aurora-space-6)' }}>
          {[
            { label: 'En attente', value: stats.pending || 0, color: '#f59e0b' },
            { label: 'Signées', value: stats.signed || 0, color: '#10b981' },
            { label: 'Refusées', value: stats.refused || 0, color: '#f43f5e' },
            { label: 'Total', value: stats.total || 0, color: '#6366f1' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <AuroraCard style={{ textAlign: 'center', padding: 'var(--aurora-space-4)' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--aurora-text-secondary)' }}>{s.label}</div>
              </AuroraCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 'var(--aurora-space-3)', marginBottom: 'var(--aurora-space-4)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-text-tertiary)' }} />
          <input
            type="text"
            placeholder="Rechercher par email ou nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              background: 'var(--aurora-bg-secondary)',
              border: '1px solid var(--aurora-border)',
              borderRadius: 8,
              color: 'var(--aurora-text-primary)',
              fontSize: 14,
            }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'var(--aurora-bg-secondary)',
            border: '1px solid var(--aurora-border)',
            borderRadius: 8,
            color: 'var(--aurora-text-primary)',
            fontSize: 14,
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="sent_to_sign">Envoyées</option>
          <option value="signed">Signées</option>
          <option value="refused">Refusées</option>
          <option value="expired">Expirées</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
          {[1, 2, 3].map(i => <AuroraSkeleton key={i} height={80} />)}
        </div>
      ) : filteredSignatures.length === 0 ? (
        <AuroraEmptyState
          icon={FileSignature}
          title="Aucune signature"
          description="Les demandes de signature apparaîtront ici"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-3)' }}>
          <AnimatePresence>
            {filteredSignatures.map((sig, idx) => {
              const config = STATUS_CONFIG[sig.status] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;

              return (
                <motion.div
                  key={sig.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <AuroraCard style={{ padding: 'var(--aurora-space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--aurora-space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-3)' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: `linear-gradient(135deg, var(--aurora-${config.color}-500) 0%, var(--aurora-${config.color}-600) 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <StatusIcon size={20} color="white" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--aurora-text-primary)' }}>
                            {sig.signer_name || sig.signer_email}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--aurora-text-tertiary)' }}>
                            {sig.signer_email}
                          </div>
                        </div>
                      </div>

                      <AuroraBadge color={config.color}>{config.label}</AuroraBadge>

                      <div style={{ fontSize: 12, color: 'var(--aurora-text-tertiary)' }}>
                        {new Date(sig.created_at).toLocaleDateString('fr-FR')}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--aurora-space-2)' }}>
                        {sig.status === 'signed' && (
                          <AuroraButton
                            variant="ghost"
                            size="sm"
                            icon={Download}
                            onClick={() => handleDownload(sig.id, `${sig.signer_name}_signe.pdf`)}
                          >
                            Télécharger
                          </AuroraButton>
                        )}
                        {(sig.status === 'pending' || sig.status === 'sent_to_sign') && (
                          <>
                            <AuroraButton
                              variant="ghost"
                              size="sm"
                              icon={Send}
                              onClick={() => handleRemind(sig.id)}
                            >
                              Relancer
                            </AuroraButton>
                            <AuroraButton
                              variant="ghost"
                              size="sm"
                              icon={RefreshCw}
                              onClick={() => handleRefreshStatus(sig.id)}
                            >
                              Actualiser
                            </AuroraButton>
                          </>
                        )}
                      </div>
                    </div>
                  </AuroraCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}