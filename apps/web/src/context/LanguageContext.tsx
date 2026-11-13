import React, { createContext, useContext } from 'react';
import { useI18n, Language, Locale } from '../lib/i18n';

export interface LanguageContextType {
  language: Language;
  locale: Locale;
  setLanguage: (lang: Language) => void;
  setLocale: (loc: Locale) => void;
  toggleLanguage: () => void;
}

const defaultLanguageContext: LanguageContextType = {
  language: 'th',
  locale: 'th',
  setLanguage: () => {},
  setLocale: () => {},
  toggleLanguage: () => {},
};

export const LanguageContext = createContext<LanguageContextType>(defaultLanguageContext);

export const useLanguage = (): LanguageContextType => {
  try {
    const i18n = useI18n();
    if (i18n && (i18n.locale || i18n.language)) {
      return {
        language: i18n.language || i18n.locale || 'th',
        locale: i18n.locale || i18n.language || 'th',
        setLanguage: i18n.setLanguage || i18n.setLocale,
        setLocale: i18n.setLocale || i18n.setLanguage,
        toggleLanguage: i18n.toggleLanguage,
      };
    }
  } catch {}

  const ctx = useContext(LanguageContext);
  return ctx || defaultLanguageContext;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode; defaultLanguage?: Language }> = ({
  children,
}) => {
  return <>{children}</>;
};
