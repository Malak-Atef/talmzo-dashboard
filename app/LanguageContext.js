// app/LanguageContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(null); // ← null للخادم

  useEffect(() => {
    // هذا يُنفَّذ فقط في العميل
    const saved = localStorage.getItem('talmzo-lang');
    const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
    const finalLang = saved || browserLang;
    setLang(finalLang);
    document.documentElement.dir = finalLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = finalLang;
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    localStorage.setItem('talmzo-lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  // إذا كانت اللغة غير معرّفة بعد (في الخادم)، استخدم 'ar' مؤقتًا
  const currentLang = lang || 'ar';

  return (
    <LanguageContext.Provider value={{ lang: currentLang, toggleLanguage }}>
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