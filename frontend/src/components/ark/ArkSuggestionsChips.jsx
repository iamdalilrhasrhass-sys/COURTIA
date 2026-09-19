import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const API_BASE = '/api';
const getToken = () => localStorage.getItem('token');

const defaultSuggestions = [
  'Résume mon activité du jour',
  'Quels clients relancer ?',
  'Génère un devis auto',
  'Alertes importantes ?',
];

export function ArkSuggestionsChips({ onSelect }) {
  const location = useLocation();
  const [suggestions, setSuggestions] = useState(defaultSuggestions);

  useEffect(() => {
    // CORRECTION 2026-09-19 : /ark/suggestions n'existe pas (404 silencieux) : la
    // route reelle est /ark/context-suggestions. On garde la liste locale en repli,
    // mais l'echec n'est plus totalement muet.
    fetch(`${API_BASE}/ark/context-suggestions?route=${encodeURIComponent(location.pathname)}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.suggestions?.length) setSuggestions(d.suggestions.map(s => s.text || s)); })
      .catch(() => {});
  }, [location.pathname]);

  return (
    <div style={{ padding: '0 var(--aurora-space-4) var(--aurora-space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--aurora-space-2)' }}>
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          onClick={() => onSelect(s)}
          style={{ padding: 'var(--aurora-space-2) var(--aurora-space-3)', fontSize: 'var(--aurora-font-xs)', background: 'var(--aurora-bg-subtle)', border: '1px solid var(--aurora-border-subtle)', borderRadius: 'var(--aurora-radius-full)', color: 'var(--aurora-text-secondary)', cursor: 'pointer' }}
          whileHover={{ background: 'var(--aurora-bg-hover)', borderColor: 'var(--aurora-border-hover)', color: 'var(--aurora-text-primary)' }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          {s}
        </motion.button>
      ))}
    </div>
  );
}

export default ArkSuggestionsChips;