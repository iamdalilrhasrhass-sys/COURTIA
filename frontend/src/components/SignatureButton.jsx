/**
 * SignatureButton — LOT 20
 * Bouton "Faire signer" avec modal de confirmation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSignature, X, Send, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { AuroraButton, AuroraBadge, useToast } from './aurora';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'amber', icon: Clock },
  sent_to_sign: { label: 'Envoyée', color: 'amber', icon: Clock },
  signed: { label: 'Signé', color: 'emerald', icon: CheckCircle2 },
  refused: { label: 'Refusé', color: 'rose', icon: XCircle },
};

export default function SignatureButton({
  documentId,
  documentBase64,
  clientId,
  clientEmail: initialEmail,
  clientName: initialName,
  title,
  onSuccess,
  status,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail || '');
  const [name, setName] = useState(initialName || '');
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Email requis', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/signatures/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          documentBase64,
          clientId,
          signerEmail: email,
          signerName: name,
          title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Demande de signature envoyée !', 'success');
        setIsOpen(false);
        onSuccess?.(data);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Si déjà un statut, afficher le badge
  if (status) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const StatusIcon = config.icon;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AuroraBadge color={config.color}>
          <StatusIcon size={12} style={{ marginRight: 4 }} />
          {config.label}
        </AuroraBadge>
      </div>
    );
  }

  return (
    <>
      <AuroraButton
        variant={compact ? 'ghost' : 'secondary'}
        size={compact ? 'sm' : 'md'}
        icon={FileSignature}
        onClick={() => setIsOpen(true)}
      >
        {compact ? '' : 'Faire signer'}
      </AuroraButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--aurora-bg-secondary)',
                borderRadius: 16,
                border: '1px solid var(--aurora-border)',
                padding: 24,
                width: '100%',
                maxWidth: 420,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileSignature size={20} color="white" />
                  </div>
                  <h3 style={{ margin: 0, color: 'var(--aurora-text-primary)' }}>
                    Demande de signature
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--aurora-text-tertiary)',
                    padding: 4,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--aurora-text-secondary)', marginBottom: 6 }}>
                    Email du signataire *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@exemple.fr"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'var(--aurora-bg-tertiary)',
                      border: '1px solid var(--aurora-border)',
                      borderRadius: 8,
                      color: 'var(--aurora-text-primary)',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--aurora-text-secondary)', marginBottom: 6 }}>
                    Nom du signataire
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'var(--aurora-bg-tertiary)',
                      border: '1px solid var(--aurora-border)',
                      borderRadius: 8,
                      color: 'var(--aurora-text-primary)',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div style={{
                  padding: 12,
                  background: 'rgba(99,102,241,0.1)',
                  borderRadius: 8,
                  marginBottom: 20,
                  fontSize: 13,
                  color: 'var(--aurora-text-secondary)',
                }}>
                  <strong style={{ color: '#6366f1' }}>ℹ️ Yousign</strong>
                  <br />
                  Le signataire recevra un email avec un lien sécurisé pour signer le document électroniquement.
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <AuroraButton
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    style={{ flex: 1 }}
                  >
                    Annuler
                  </AuroraButton>
                  <AuroraButton
                    type="submit"
                    variant="primary"
                    icon={loading ? Loader2 : Send}
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    {loading ? 'Envoi...' : 'Envoyer'}
                  </AuroraButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}