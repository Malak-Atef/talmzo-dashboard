// app/LanguageContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const getInitialLang = () => {
  if (typeof window === 'undefined') return 'ar'; // for SSR
  const saved = localStorage.getItem('talmzo-lang');
  const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
  return saved || browserLang;
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  // تحديث localStorage وHTML attributes عند تغيير اللغة
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('talmzo-lang', lang);
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}