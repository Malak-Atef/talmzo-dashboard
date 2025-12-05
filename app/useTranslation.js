'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

export function useTranslation() {
  const { lang } = useLanguage();
  const [t, setT] = useState({});

  useEffect(() => {
    const loadTranslations = async () => {
      const res = await fetch(`/locales/${lang}.json`);
      const data = await res.json();
      setT(() => data);
    };
    loadTranslations();
  }, [lang]);

  return (key) => t[key] || key;
}