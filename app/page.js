// app/page.js
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from './LanguageContext';
import { useTranslation } from './useTranslation';
import Link from 'next/link';
import Toast from './components/Toast';

export default function Home() {
  const { lang, toggleLanguage } = useLanguage();
  const t = useTranslation();
  const [toast, setToast] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  // إذا ما وُجد eventId، نوجه إلى صفحة المؤتمرات
  useEffect(() => {
    if (!eventId) {
      router.push('/events');
    }
  }, [eventId, router]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  if (!eventId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التوجيه...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      {/* عرض اسم المؤتمر */}
      <div className="w-full max-w-4xl mb-6 text-end">
        <Link
          href="/events"
          className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
        >
          ← {t('backToConferences')}
        </Link>
      </div>

      <div className="text-center mb-8">
        <Image
          src="/talmzo-logo.png"
          alt="Talmzo Logo"
          width={200}
          height={200}
          className="mx-auto object-contain mb-4"
        />
        <h1 className="text-3xl font-bold text-dark mt-2">{t('dashboard')}</h1>
        <p className="text-gray-600 mt-2 text-sm">
          {t('currentConferenceId')}: <code className="bg-gray-100 px-2 py-1 rounded">{eventId}</code>
        </p>
      </div>

      {/* زر تبديل اللغة */}
      <button
        onClick={toggleLanguage}
        className="mb-8 px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition shadow-sm"
        aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        {lang === 'ar' ? 'English' : 'العربية'}
      </button>

      {/* الشبكة الاحترافية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* بطاقة: إضافة جلسة */}
        <Link
          href={`/add-session?eventId=${eventId}`}
          className="card bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <span className="text-xl text-primary">➕</span>
          </div>
          <h2 className="text-lg font-bold text-dark mb-1">{t('addSession')}</h2>
          <p className="text-gray-600 text-xs">{t('createNewSession')}</p>
        </Link>

        {/* بطاقة: الجلسات */}
        <Link
          href={`/sessions?eventId=${eventId}`}
          className="card bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
            <span className="text-xl text-secondary">👁️</span>
          </div>
          <h2 className="text-lg font-bold text-dark mb-1">{t('sessions')}</h2>
          <p className="text-gray-600 text-xs">{t('viewAllSessions')}</p>
        </Link>

        {/* بطاقة: التقارير */}
        <Link
          href={`/reports?eventId=${eventId}`}
          className="card bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-3">
            <span className="text-xl text-secondary">📊</span>
          </div>
          <h2 className="text-lg font-bold text-dark mb-1">{t('reports')}</h2>
          <p className="text-gray-600 text-xs">{t('viewAttendanceReports')}</p>
        </Link>

        {/* بطاقة: رفع المشاركين */}
        <Link
          href={`/upload-participants?eventId=${eventId}`}
          className="card bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
            <span className="text-xl text-accent">👥</span>
          </div>
          <h2 className="text-lg font-bold text-dark mb-1">{t('uploadParticipants')}</h2>
          <p className="text-gray-600 text-xs">{t('manageParticipants')}</p>
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-12 text-gray-500 text-xs">
        © {new Date().getFullYear()} By Malak Atef | All rights reserved.
      </div>

      {/* Toast */}
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