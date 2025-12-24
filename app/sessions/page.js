// app/sessions/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

function SessionsContent() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    if (!eventId) {
      router.push('/events');
      return;
    }

    const loadData = async () => {
      try {
        // تحميل المؤتمر
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventDoc.id, ...eventDoc.data() });
        }

        // تحميل الجلسات
        const q = query(
          collection(db, 'sessions'),
          where('eventId', '==', eventId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const sessionsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(sessionsList);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setToast({ message: t('failedToLoadSessions'), type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]); // ← فقط eventId

  if (!eventId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl">
        {/* شريط التحكم العلوي */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/events')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium flex items-center gap-1"
          >
            ← {t('backToConferences')}
          </button>
        </div>

        {/* العنوان */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-secondary">👁️</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">
            {t('sessions')} — {eventData?.name || t('unknownEvent')}
          </h1>
          <p className="text-gray-600 mt-2">{t('viewAndManageSessions')}</p>
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
            <button
              onClick={() => router.push(`/add-session?eventId=${eventId}`)}
              className="btn-primary px-6 py-2"
            >
              ➕ {t('addSession')}
            </button>
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
                  <button
                    onClick={() => router.push(`/admin-scan?eventId=${eventId}&sessionId=${session.id}`)}
                    className="btn-primary px-4 py-2 flex items-center gap-1"
                  >
                    📱 {t('adminScan')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* زر إضافة جلسة */}
        <div className="mt-10 text-center">
          <button
            onClick={() => router.push(`/add-session?eventId=${eventId}`)}
            className="inline-flex items-center gap-2 btn-accent px-6 py-3 text-dark font-bold rounded-full shadow hover:shadow-md transition"
          >
            ➕ {t('addSession')}
          </button>
        </div>
      </div>

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

export default function SessionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    }>
      <SessionsContent />
    </Suspense>
  );
}