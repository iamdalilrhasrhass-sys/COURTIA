/**
 * i18n Configuration — LOT 23
 * Internationalisation FR/EN/ES
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import des fichiers de traduction
import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';

// Détecte la langue préférée du navigateur ou utilise la langue sauvegardée
const getDefaultLanguage = () => {
  // Vérifier si une langue est sauvegardée en localStorage
  const savedLang = localStorage.getItem('courtia_language');
  if (savedLang && ['fr', 'en', 'es'].includes(savedLang)) {
    return savedLang;
  }
  
  // Sinon, détecter la langue du navigateur
  const browserLang = navigator.language?.split('-')[0];
  if (['fr', 'en', 'es'].includes(browserLang)) {
    return browserLang;
  }
  
  // Par défaut, français
  return 'fr';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es }
    },
    lng: getDefaultLanguage(),
    fallbackLng: 'fr',
    
    interpolation: {
      escapeValue: false // React échappe déjà les valeurs
    },
    
    // Détection automatique désactivée, on gère manuellement
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Helper pour changer de langue
export const changeLanguage = (lang) => {
  if (['fr', 'en', 'es'].includes(lang)) {
    localStorage.setItem('courtia_language', lang);
    i18n.changeLanguage(lang);
    // Mettre à jour l'attribut lang du document
    document.documentElement.lang = lang;
  }
};

// Liste des langues disponibles
export const availableLanguages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

export default i18n;
