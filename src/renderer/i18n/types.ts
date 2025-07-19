import 'react-i18next';

// Import the English translations as type definitions
import common from './locales/en/common.json';
import header from './locales/en/header.json';
import settings from './locales/en/settings.json';
import file_translation from './locales/en/file_translation.json';
import glossary from './locales/en/glossary.json';
import chatbot from './locales/en/chatbot.json';

// Extend the react-i18next module to include our resource types
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      header: typeof header;
      settings: typeof settings;
      file_translation: typeof file_translation;
      glossary: typeof glossary;
      chatbot: typeof chatbot;
    };
  }
}

// Export supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ko: '한국어',
  fr: 'Français',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;