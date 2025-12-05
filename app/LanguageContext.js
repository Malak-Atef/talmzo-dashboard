// app/LanguageContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    const saved = localStorage.getItem('talmzo-lang');
    const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
    setLang(saved || browserLang);
  }, []);

  useEffect(() => {
    localStorage.setItem('talmzo-lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar');
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