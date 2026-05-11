import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, FileCheck, Shield, Sparkles, Download, Eye, Clock, User } from 'lucide-react';
import { AuroraPageHeader, AuroraCard, AuroraButton, AuroraSelect, AuroraBadge, AuroraSkeleton, AuroraEmptyState, AuroraDialog, useToast } from '../../components/aurora';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('token');

const docTypes = [
  { id: 'ipid', label: 'IPID', description: "Document d'information produit", icon: FileText, color: '#3b82f6' },
  { id: 'dda', label: 'DDA', description: 'Devoir de conseil', icon: FileCheck, color: '#22c55e' },
  { id: 'dc', label: 'Document Contractuel', description: 'Conditions particulières', icon: Shield, color: '#a855f7' },
];

export function ComposeV2() {
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          fetch(`${API_BASE}/clients?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
          fetch(`${API_BASE}/compose/documents`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json()),
        ]);
        setClients(cRes.clients || cRes || []);
        setDocuments(dRes.documents || dRes || []);
      } catch (e) { toast.error('Erreur chargement'); }
      setLoading(false);
    };
    load();
  }, []);

  const generate = async (type) => {
    if (!selectedClient) { toast.warning('Sélectionnez un client'); return; }
    setGenerating(type);
    try {
      const res = await fetch(`${API_BASE}/compose/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, clientId: selectedClient }),
      });
      const doc = await res.json();
      setDocuments(prev => [doc, ...prev]);
      toast.success(`${type.toUpperCase()} généré`);
    } catch (e) { toast.error('Erreur génération'); }
    setGenerating(null);
  };

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader title="ARK Compose" subtitle="Génération automatique de documents réglementaires" />
      <div style={{ maxWidth: 400, marginBottom: 'var(--aurora-space-4)' }}>
        <AuroraSelect label="Client" placeholder="Sélectionner..." options={clients.map(c => ({ value: c.id, label: `${c.prenom || ''} ${c.nom || ''}` }))} value={selectedClient} onChange={setSelectedClient} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--aurora-space-4)', marginBottom: 'var(--aurora-space-6)' }}>
        {docTypes.map(doc => (
          <motion.div key={doc.id} whileHover={{ y: -4 }}>
            <AuroraCard style={{ borderTop: `3px solid ${doc.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-3)', marginBottom: 'var(--aurora-space-3)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--aurora-radius-md)', background: `${doc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <doc.icon size={22} style={{ color: doc.color }} />
                </div>
                <div><h3 style={{ margin: 0, fontSize: 'var(--aurora-font-lg)', fontWeight: 600 }}>{doc.label}</h3><p style={{ margin: 0, fontSize: 'var(--aurora-font-sm)', color: 'var(--aurora-text-secondary)' }}>{doc.description}</p></div>
              </div>
              <AuroraButton variant="secondary" style={{ width: '100%' }} onClick={() => generate(doc.id)} disabled={generating === doc.id}>
                <Sparkles size={16} style={{ marginRight: 8 }} />{generating === doc.id ? 'Génération...' : 'Générer'}
              </AuroraButton>
            </AuroraCard>
          </motion.div>
        ))}
      </div>
      <h3 style={{ fontSize: 'var(--aurora-font-lg)', fontWeight: 600, marginBottom: 'var(--aurora-space-3)' }}>Documents générés</h3>
      {loading ? <AuroraSkeleton lines={4} /> : documents.length === 0 ? <AuroraEmptyState icon={FileText} title="Aucun document" description="Générez votre premier document" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-2)' }}>
          {documents.map((doc, i) => (
            <motion.div key={doc.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-3)', padding: 'var(--aurora-space-3)', background: 'var(--aurora-bg-card)', border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-md)' }} whileHover={{ background: 'var(--aurora-bg-hover)' }}>
              <FileText size={20} style={{ color: 'var(--aurora-accent)' }} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 500 }}>{doc.type?.toUpperCase()} - {doc.clientName || 'Client'}</div><div style={{ fontSize: 'var(--aurora-font-xs)', color: 'var(--aurora-text-muted)' }}><Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</div></div>
              <AuroraButton variant="ghost" size="sm" onClick={() => setPreviewDoc(doc)}><Eye size={16} /></AuroraButton>
              <AuroraButton variant="ghost" size="sm"><Download size={16} /></AuroraButton>
            </motion.div>
          ))}
        </div>
      )}
      <AuroraDialog open={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.type?.toUpperCase()} size="lg">
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--aurora-font-sm)', lineHeight: 1.6 }}>{previewDoc?.content || 'Aperçu non disponible'}</div>
      </AuroraDialog>
    </div>
  );
}

export default ComposeV2;