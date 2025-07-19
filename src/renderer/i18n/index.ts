import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enCommon from './locales/en/common.json';
import enHeader from './locales/en/header.json';
import enSettings from './locales/en/settings.json';
import enFileTranslation from './locales/en/file_translation.json';
import enGlossary from './locales/en/glossary.json';
import enChatbot from './locales/en/chatbot.json';

import koCommon from './locales/ko/common.json';
import koHeader from './locales/ko/header.json';
import koSettings from './locales/ko/settings.json';
import koFileTranslation from './locales/ko/file_translation.json';
import koGlossary from './locales/ko/glossary.json';
import koChatbot from './locales/ko/chatbot.json';

import frCommon from './locales/fr/common.json';
import frHeader from './locales/fr/header.json';
import frSettings from './locales/fr/settings.json';
import frFileTranslation from './locales/fr/file_translation.json';
import frGlossary from './locales/fr/glossary.json';
import frChatbot from './locales/fr/chatbot.json';

// Define translation resources
const resources = {
  en: {
    common: enCommon,
    header: enHeader,
    settings: enSettings,
    file_translation: enFileTranslation,
    glossary: enGlossary,
    chatbot: enChatbot,
  },
  ko: {
    common: koCommon,
    header: koHeader,
    settings: koSettings,
    file_translation: koFileTranslation,
    glossary: koGlossary,
    chatbot: koChatbot,
  },
  fr: {
    common: frCommon,
    header: frHeader,
    settings: frSettings,
    file_translation: frFileTranslation,
    glossary: frGlossary,
    chatbot: frChatbot,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect language from browser/localStorage
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Default to English if detection fails
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'header', 'settings', 'file_translation', 'glossary', 'chatbot'],

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React-specific options
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

export default i18n;