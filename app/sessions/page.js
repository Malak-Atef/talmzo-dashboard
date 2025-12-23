// app/sessions/page.js
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Link from 'next/link';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

export default function SessionsPage() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // إذا ما وُجد eventId، نوجه إلى صفحة المؤتمرات
  useEffect(() => {
    if (!eventId) {
      router.push('/events');
    }
  }, [eventId, router]);

  useEffect(() => {
    if (!eventId) return;

    const fetchSessions = async () => {
      try {
        // ← إضافة شرط eventId
        const q = query(
          collection(db, 'sessions'),
          where('eventId', '==', eventId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const sessionsList = [];
        querySnapshot.forEach((doc) => {
          sessionsList.push({ id: doc.id, ...doc.data() });
        });
        setSessions(sessionsList);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setToast({ message: t('failedToLoadSessions') || 'فشل تحميل الجلسات', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [eventId, t]);

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
      <div className="w-full max-w-4xl">
        {/* رأس الصفحة */}
        <div className="text-end mb-4">
          <Link
            href={`/?eventId=${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
          >
            ← {t('backToDashboard')}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-secondary">👁️</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">{t('sessions')}</h1>
          <p className="text-gray-600 mt-2">{t('viewAndManageSessions')}</p>
          <p className="text-xs text-gray-500 mt-2">
            {t('currentConferenceId')}: <code className="bg-gray-100 px-1 py-0.5 rounded">{eventId}</code>
          </p>
        </div>

        {/* قائمة الجلسات */}
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-gray-600">{t('loadingSessions')}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow border border-gray-100">
            <p className="text-gray-600 text-lg mb-4">{t('noSessions')}</p>
            <Link
              href={`/add-session?eventId=${eventId}`}
              className="inline-block btn-primary px-6 py-2"
            >
              ➕ {t('addSession')}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white p-5 rounded-2xl shadow border border-gray-100 hover:shadow-md transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-dark">{session.sessionName}</h2>
                    <p className="text-gray-600 mt-1">
                      <span className="font-medium">{t('sessionType')}:</span> {session.sessionType}
                    </p>
                    {session.attendanceMode === 'Group' && session.groupName && (
                      <p className="text-gray-600">
                        <span className="font-medium">{t('group')}:</span> {session.groupName}
                      </p>
                    )}
                  </div>
                  <Link
                    // ← تمرير eventId و sessionId معًا
                    href={`/admin-scan?eventId=${eventId}&sessionId=${session.id}`}
                    className="btn-primary px-4 py-2"
                  >
                    {t('adminScan')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* زر إضافة جلسة في الأسفل */}
        <div className="mt-10 text-center">
          <Link
            href={`/add-session?eventId=${eventId}`}
            className="inline-flex items-center gap-2 btn-accent px-6 py-3 text-dark font-bold rounded-full shadow hover:shadow-md transition"
          >
            ➕ {t('addSession')}
          </Link>
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