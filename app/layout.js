// app/layout.js
// بدون 'use client' ← Server Component

import { LanguageProvider } from './LanguageContext';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="bg-light text-dark min-h-screen" suppressHydrationWarning>
        <LanguageProvider>
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}