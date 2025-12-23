// app/add-session/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '../useTranslation';
import { useLanguage } from '../LanguageContext';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Toast from '../components/Toast';
import Link from 'next/link';

export default function AddSession() {
  const t = useTranslation();
  const { lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  const [sessionName, setSessionName] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [attendanceMode, setAttendanceMode] = useState('All');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // إذا ما وُجد eventId، نوجه إلى صفحة المؤتمرات
  useEffect(() => {
    if (!eventId) {
      router.push('/events');
    }
  }, [eventId, router]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'sessions'), {
        eventId, // ← إضافة eventId هنا
        sessionName,
        sessionType,
        attendanceMode,
        groupName: attendanceMode === 'Group' ? groupName : '',
        createdAt: serverTimestamp(),
      });

      showToast(t('sessionAddedSuccessfully'), 'success');
      setSessionName('');
      setSessionType('');
      setAttendanceMode('All');
      setGroupName('');
    } catch (error) {
      console.error('Error adding session:', error);
      showToast(t('failedToAddSession'), 'error');
    } finally {
      setLoading(false);
    }
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
      <div className="w-full max-w-xl">
        {/* رأس الصفحة */}
        <div className="text-end mb-6">
          <Link
            href={`/?eventId=${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
          >
            ← {t('backToDashboard')}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-primary">➕</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">{t('addSession')}</h1>
          <p className="text-gray-600 mt-2">{t('fillSessionDetails')}</p>
        </div>

        {/* نموذج الإضافة */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-semibold text-dark mb-2">{t('sessionName')}</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block font-semibold text-dark mb-2">{t('sessionType')}</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block font-semibold text-dark mb-2">{t('attendanceMode')}</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={attendanceMode}
                onChange={(e) => setAttendanceMode(e.target.value)}
                disabled={loading}
              >
                <option value="All">{t('allAttendees')}</option>
                <option value="Group">{t('groupOnly')}</option>
              </select>
            </div>

            {attendanceMode === 'Group' && (
              <div>
                <label className="block font-semibold text-dark mb-2">{t('groupName')}</label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={lang === 'ar' ? 'المجموعة أ، المجموعة ب…' : 'Group A, Group B…'}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 rounded-lg font-bold text-white transition ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {loading ? t('saving') : t('saveSession')}
              </button>

              <Link
                href={`/?eventId=${eventId}`}
                className="flex-1 py-3 text-center rounded-lg font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                {t('cancel')}
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Toast الإشعار */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type === 'error' ? 'error' : 'success'}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}