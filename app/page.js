// app/page.js
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useLanguage } from './LanguageContext';
import { useTranslation } from './useTranslation';
import Link from 'next/link';
import Toast from './components/Toast';

export default function Home() {
  const { lang, toggleLanguage } = useLanguage();
  const t = useTranslation();
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      <div className="text-center mb-12">
        <Image
          src="/talmzo-logo.png"
          alt="Talmzo Logo"
          width={260}
          height={260}
          className="mx-auto object-contain mb-4"
        />
        <h1 className="text-4xl font-bold text-dark mt-2">{t('dashboard')}</h1>
      </div>
      {/* زر تبديل اللغة */}
      <button
        onClick={toggleLanguage}
        className="mb-10 px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition shadow-sm"
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        {lang === 'ar' ? 'English' : 'العربية'}
      </button>

      {/* الشبكة الاحترافية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* بطاقة: إضافة جلسة */}
        <Link
          href="/add-session"
          className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-2xl text-primary">➕</span>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">{t('addSession')}</h2>
          <p className="text-gray-600 text-sm">{t('createNewSession')}</p>
        </Link>

        {/* بطاقة: الجلسات */}
        <Link
          href="/sessions"
          className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
            <span className="text-2xl text-secondary">👁️</span>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">{t('sessions')}</h2>
          <p className="text-gray-600 text-sm">{t('viewAllSessions')}</p>
        </Link>

        {/* بطاقة: التقارير */}
        <Link
          href="/reports"
          className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
            <span className="text-2xl text-secondary">📊</span>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">{t('reports')}</h2>
          <p className="text-gray-600 text-sm">{t('viewAttendanceReports')}</p>
        </Link>

        {/* بطاقة: رفع المشاركين */}
        <Link
          href="/upload-participants"
          className="card bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <span className="text-2xl text-accent">👥</span>
          </div>
          <h2 className="text-xl font-bold text-dark mb-2">{t('uploadParticipants')}</h2>
          <p className="text-gray-600 text-sm">{t('manageParticipants')}</p>
        </Link>
      </div>

      {/* Footer بسيط */}
      <div className="mt-16 text-gray-500 text-sm">
        © {new Date().getFullYear()} By Malak Atef | All rights reserved.
      </div>

      {/* Toast الظاهر */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}