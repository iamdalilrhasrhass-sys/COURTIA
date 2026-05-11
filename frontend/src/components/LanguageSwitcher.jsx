/**
 * LanguageSwitcher.jsx — LOT 23
 * Sélecteur de langue FR/EN/ES pour la navigation
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { changeLanguage, availableLanguages } from '../i18n';

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const currentLang = availableLanguages.find(l => l.code === i18n.language) || availableLanguages[0];
  
  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (langCode) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 6 : 8,
          padding: compact ? '6px 10px' : '8px 12px',
          background: isOpen ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          cursor: 'pointer',
          color: 'white',
          fontSize: compact ? 12 : 13,
          fontWeight: 500,
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.15)'}
        onMouseLeave={e => !isOpen && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      >
        {compact ? (
          <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
        ) : (
          <>
            <Globe size={16} style={{ opacity: 0.7 }} />
            <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
            <span style={{ opacity: 0.9 }}>{currentLang.code.toUpperCase()}</span>
            <ChevronDown 
              size={14} 
              style={{ 
                opacity: 0.5,
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} 
            />
          </>
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              background: 'linear-gradient(135deg, rgba(20,20,30,0.98), rgba(30,30,45,0.95))',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 10,
              padding: 6,
              minWidth: 140,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
              zIndex: 1000
            }}
          >
            {availableLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  background: i18n.language === lang.code ? 'rgba(139,92,246,0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = i18n.language === lang.code ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = i18n.language === lang.code ? 'rgba(139,92,246,0.2)' : 'transparent'}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.name}</span>
                {i18n.language === lang.code && (
                  <Check size={14} color="#a78bfa" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Version compacte pour mobile
export function LanguageSwitcherMobile() {
  return <LanguageSwitcher compact />;
}
