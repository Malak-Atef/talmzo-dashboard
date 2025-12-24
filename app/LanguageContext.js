// app/LanguageContext.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// دالة مساعدة لتحميل اللغة من localStorage (آمنة للخادم)
function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'ar'; // افتراضي في الخادم
  }
  const saved = localStorage.getItem('talmzo-lang');
  const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
  return saved || browserLang;
}

export function LanguageProvider({ children }) {
  // استخدام دالة مهيّئة لتجنب setState في useEffect
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    // تطبيق الإعدادات بعد التحميل الأولي
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // حفظ في localStorage عند التغيير
    localStorage.setItem('talmzo-lang', lang);
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