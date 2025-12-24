// app/LanguageContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // حالة أولية آمنة للخادم
  const [lang, setLang] = useState('ar'); // ← الافتراضي

  useEffect(() => {
    // بعد التحميل في العميل، نأخذ القيمة الحقيقية
    const saved = localStorage.getItem('talmzo-lang');
    const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
    const finalLang = saved || browserLang;
    setLang(finalLang);

    // تطبيق الاتجاه على <html>
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