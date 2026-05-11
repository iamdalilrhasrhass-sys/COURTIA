import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSearch, Upload, Eye, Download, CheckCircle, AlertCircle, Clock, Filter } from 'lucide-react';
import { AuroraPageHeader, AuroraCard, AuroraButton, AuroraBadge, AuroraSkeleton, AuroraEmptyState, AuroraSelect, AuroraDialog, AuroraTabs, useToast } from '../../components/aurora';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('token');

export function DocVisionV2() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/docvision/extractions`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setDocs(d.extractions || d.documents || d || []))
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'all' ? docs : docs.filter(d => d.type === activeTab);
  const tabs = [
    { value: 'all', label: 'Tous', count: docs.length },
    { value: 'cni', label: 'CNI', count: docs.filter(d => d.type === 'cni').length },
    { value: 'rib', label: 'RIB', count: docs.filter(d => d.type === 'rib').length },
    { value: 'contrat', label: 'Contrats', count: docs.filter(d => d.type === 'contrat').length },
  ];

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader title="Doc Vision" subtitle="Extraction intelligente de documents" actions={<AuroraButton><Upload size={16} style={{ marginRight: 8 }} />Uploader</AuroraButton>} />
      <div style={{ marginBottom: 'var(--aurora-space-4)' }}><AuroraTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} /></div>
      {loading ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--aurora-space-4)' }}>{Array.from({ length: 6 }).map((_, i) => <AuroraSkeleton key={i} height={180} />)}</div> : filtered.length === 0 ? <AuroraEmptyState icon={FileSearch} title="Aucun document" description="Uploadez des documents pour extraction" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--aurora-space-4)' }}>
          {filtered.map((doc, i) => (
            <motion.div key={doc.id || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4 }}>
              <AuroraCard style={{ cursor: 'pointer' }} onClick={() => setSelected(doc)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--aurora-space-3)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--aurora-radius-md)', background: 'var(--aurora-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSearch size={22} style={{ color: 'var(--aurora-accent)' }} />
                  </div>
                  <AuroraBadge variant={doc.confidence > 0.9 ? 'success' : doc.confidence > 0.7 ? 'warning' : 'error'} size="sm">
                    {Math.round((doc.confidence || 0.95) * 100)}%
                  </AuroraBadge>
                </div>
                <h4 style={{ margin: '0 0 var(--aurora-space-1)', fontWeight: 600 }}>{doc.filename || doc.name || 'Document'}</h4>
                <div style={{ fontSize: 'var(--aurora-font-xs)', color: 'var(--aurora-text-muted)', marginBottom: 'var(--aurora-space-3)' }}>
                  <span style={{ textTransform: 'uppercase' }}>{doc.type || 'autre'}</span> • {new Date(doc.createdAt || Date.now()).toLocaleDateString('fr-FR')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.keys(doc.extracted || doc.data || {}).slice(0, 3).map(k => <AuroraBadge key={k} size="sm">{k}</AuroraBadge>)}
                  {Object.keys(doc.extracted || doc.data || {}).length > 3 && <AuroraBadge size="sm">+{Object.keys(doc.extracted || doc.data || {}).length - 3}</AuroraBadge>}
                </div>
              </AuroraCard>
            </motion.div>
          ))}
        </div>
      )}
      <AuroraDialog open={!!selected} onClose={() => setSelected(null)} title={selected?.filename || 'Extraction'} size="lg">
        {selected && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--aurora-space-3)' }}>
            {Object.entries(selected.extracted || selected.data || {}).map(([k, v]) => (
              <div key={k} style={{ padding: 'var(--aurora-space-3)', background: 'var(--aurora-bg-subtle)', borderRadius: 'var(--aurora-radius-md)' }}>
                <div style={{ fontSize: 'var(--aurora-font-xs)', color: 'var(--aurora-text-muted)', marginBottom: 4, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontWeight: 500 }}>{String(v)}</div>
              </div>
            ))}
          </div>
        )}
      </AuroraDialog>
    </div>
  );
}

export default DocVisionV2;