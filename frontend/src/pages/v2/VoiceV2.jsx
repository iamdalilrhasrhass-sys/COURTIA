import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Upload, Play, Pause, FileAudio, Clock, User, CheckCircle, ChevronRight, X } from 'lucide-react';
import { AuroraPageHeader, AuroraCard, AuroraButton, AuroraBadge, AuroraSkeleton, AuroraEmptyState, AuroraDialog, useToast } from '../../components/aurora';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('token');

export function VoiceV2() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [intakes, setIntakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/voice/intakes`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setIntakes(d.intakes || d || []))
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, []);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('audio', file);
    try {
      const res = await fetch(`${API_BASE}/voice/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form });
      const intake = await res.json();
      setIntakes(prev => [intake, ...prev]);
      toast.success('Audio uploadé et en cours de traitement');
    } catch (e) { toast.error('Erreur upload'); }
    setUploading(false);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files[0]); };

  const applyData = async (intakeId) => {
    try {
      await fetch(`${API_BASE}/voice/intakes/${intakeId}/apply`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Données appliquées au client');
      setSelected(null);
    } catch (e) { toast.error('Erreur application'); }
  };

  return (
    <div style={{ padding: 'var(--aurora-space-6)', maxWidth: 1400, margin: '0 auto' }}>
      <AuroraPageHeader title="Voice Intake" subtitle="Transcription et extraction automatique depuis l'audio" />
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{ padding: 'var(--aurora-space-8)', marginBottom: 'var(--aurora-space-6)', background: dragOver ? 'var(--aurora-bg-hover)' : 'var(--aurora-bg-card)', border: `2px dashed ${dragOver ? 'var(--aurora-accent)' : 'var(--aurora-border-subtle)'}`, borderRadius: 'var(--aurora-radius-xl)', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        whileHover={{ borderColor: 'var(--aurora-border-hover)' }}
      >
        <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        <Upload size={40} style={{ color: 'var(--aurora-text-muted)', marginBottom: 'var(--aurora-space-3)' }} />
        <div style={{ fontSize: 'var(--aurora-font-lg)', fontWeight: 600, color: 'var(--aurora-text-primary)', marginBottom: 'var(--aurora-space-1)' }}>
          {uploading ? 'Upload en cours...' : 'Glissez un fichier audio ici'}
        </div>
        <div style={{ fontSize: 'var(--aurora-font-sm)', color: 'var(--aurora-text-secondary)' }}>ou cliquez pour sélectionner (MP3, WAV, M4A)</div>
      </motion.div>

      <h3 style={{ fontSize: 'var(--aurora-font-lg)', fontWeight: 600, marginBottom: 'var(--aurora-space-3)' }}>Intakes récents</h3>
      {loading ? <AuroraSkeleton lines={4} /> : intakes.length === 0 ? <AuroraEmptyState icon={FileAudio} title="Aucun intake" description="Uploadez votre premier fichier audio" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-2)' }}>
          {intakes.map((intake, i) => (
            <motion.div key={intake.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} onClick={() => setSelected(intake)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--aurora-space-3)', padding: 'var(--aurora-space-4)', background: 'var(--aurora-bg-card)', border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-md)', cursor: 'pointer' }} whileHover={{ background: 'var(--aurora-bg-hover)', x: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--aurora-radius-md)', background: 'var(--aurora-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileAudio size={22} style={{ color: 'var(--aurora-accent)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{intake.filename || `Intake #${intake.id}`}</div>
                <div style={{ display: 'flex', gap: 'var(--aurora-space-3)', fontSize: 'var(--aurora-font-xs)', color: 'var(--aurora-text-muted)' }}>
                  <span><Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{intake.duration || '2:34'}</span>
                  {intake.clientName && <span><User size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{intake.clientName}</span>}
                </div>
              </div>
              <AuroraBadge variant={intake.status === 'processed' ? 'success' : intake.status === 'processing' ? 'warning' : 'default'} dot>{intake.status || 'traité'}</AuroraBadge>
              <ChevronRight size={16} style={{ color: 'var(--aurora-text-muted)' }} />
            </motion.div>
          ))}
        </div>
      )}

      <AuroraDialog open={!!selected} onClose={() => setSelected(null)} title="Détail de l'intake" size="lg" footer={<><AuroraButton variant="ghost" onClick={() => setSelected(null)}>Fermer</AuroraButton><AuroraButton onClick={() => applyData(selected?.id)}><CheckCircle size={16} style={{ marginRight: 8 }} />Appliquer au client</AuroraButton></>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aurora-space-4)' }}>
            <div><h4 style={{ margin: '0 0 var(--aurora-space-2)', fontSize: 'var(--aurora-font-base)', fontWeight: 600 }}>Transcription</h4><div style={{ padding: 'var(--aurora-space-3)', background: 'var(--aurora-bg-subtle)', borderRadius: 'var(--aurora-radius-md)', fontSize: 'var(--aurora-font-sm)', lineHeight: 1.6, maxHeight: 200, overflowY: 'auto' }}>{selected.transcript || 'Transcription non disponible'}</div></div>
            <div><h4 style={{ margin: '0 0 var(--aurora-space-2)', fontSize: 'var(--aurora-font-base)', fontWeight: 600 }}>Données extraites</h4><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--aurora-space-2)' }}>
              {Object.entries(selected.extracted_data || selected.extractedData || {}).map(([k, v]) => (
                <div key={k} style={{ padding: 'var(--aurora-space-2)', background: 'var(--aurora-bg-subtle)', borderRadius: 'var(--aurora-radius-sm)' }}>
                  <div style={{ fontSize: 'var(--aurora-font-xs)', color: 'var(--aurora-text-muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontWeight: 500 }}>{String(v)}</div>
                </div>
              ))}
            </div></div>
          </div>
        )}
      </AuroraDialog>
    </div>
  );
}

export default VoiceV2;