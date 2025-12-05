// app/layout.js
'use client';

import { LanguageProvider, useLanguage } from './LanguageContext';
import './globals.css';

function RootContent({ children }) {
  const { lang } = useLanguage();
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <body className="bg-light text-dark min-h-screen">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}

export default function RootLayout({ children }) {
  return (
    <LanguageProvider>
      <RootContent>{children}</RootContent>
    </LanguageProvider>
  );
}