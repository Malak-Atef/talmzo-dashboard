// app/events/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Link from 'next/link';
import { useTranslation } from '../useTranslation';
import { useLanguage } from '../LanguageContext'; // ← أضف هذا الاستيراد
import Toast from '../components/Toast';

// معلومات مسبقة عن المؤتمرات المعروفة
const KNOWN_CONFERENCES = {
  talmzo: { name: 'تلمذو', logo: 'talmzo.png', color: '#0D9488' },
  kashaf: { name: 'كشاف', logo: 'kashaf.png', color: '#3B82F6' },
  el7ad: { name: 'الي أقصى الأرض', logo: 'el7ad.png', color: '#DC2626' },
  al3lam: { name: 'علمتني', logo: 'al3lam.png', color: '#D97706' },
};

function EventsContent() {
  const t = useTranslation();
  const { lang, toggleLanguage } = useLanguage(); // ← استخدم اللغة

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState('');
  const [newEventKey, setNewEventKey] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'events'));
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(list);
      } catch (err) {
        console.error('Error loading events:', err);
        setToast({ message: t('failedToLoadEvents'), type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [t]);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;

    let eventData = {
      name: newEventName.trim(),
      createdAt: serverTimestamp(),
    };

    if (newEventKey && KNOWN_CONFERENCES[newEventKey]) {
      const conf = KNOWN_CONFERENCES[newEventKey];
      eventData = {
        ...eventData,
        logo: conf.logo,
        color: conf.color,
      };
    }

    try {
      await addDoc(collection(db, 'events'), eventData);
      setNewEventName('');
      setNewEventKey('');
      const snapshot = await getDocs(collection(db, 'events'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(list);
      setToast({ message: t('eventAddedSuccessfully'), type: 'success' });
    } catch (err) {
      console.error('Error adding event:', err);
      setToast({ message: t('failedToAddEvent'), type: 'error' });
    }
  };

  const getConferenceData = (event) => {
    const base = {
      name: event.name || 'مؤتمر غير معروف',
      logo: event.logo || 'default.png',
      color: event.color || '#6B7280',
    };
    const logoSrc = event.logo?.startsWith('http')
      ? event.logo
      : `/logos/${event.logo || 'default.png'}`;
    return { ...base, logoSrc };
  };

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      {/* ✅ زر تبديل اللغة في الأعلى */}
      <div className="self-end w-full max-w-4xl mb-6">
        <button
          onClick={toggleLanguage}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium shadow-sm"
          aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
        >
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-purple-600">🎪</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">{t('conferences')}</h1>
          <p className="text-gray-600 mt-2">{t('selectOrCreateConference')}</p>
        </div>

        {/* إضافة مؤتمر جديد */}
        <div className="bg-white p-5 rounded-2xl shadow border border-gray-100 mb-8">
          <h2 className="font-bold text-dark mb-3">{t('addNewConference')}</h2>
          <form onSubmit={handleAddEvent} className="space-y-3">
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder={t('conferenceName')}
              className="w-full p-2 border border-gray-300 rounded-lg"
              required
            />
            <select
              value={newEventKey}
              onChange={(e) => setNewEventKey(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">{t('selectKnownConference')}</option>
              {Object.entries(KNOWN_CONFERENCES).map(([key, conf]) => (
                <option key={key} value={key}>{conf.name}</option>
              ))}
              <option value="custom">{t('otherConference')}</option>
            </select>
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded-lg font-medium"
            >
              ➕ {t('addConference')}
            </button>
          </form>
        </div>

        {/* شبكة المؤتمرات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-center col-span-full">{t('loading')}</p>
          ) : events.length === 0 ? (
            <p className="text-center col-span-full text-gray-500">{t('noConferencesYet')}</p>
          ) : (
            events.map((event) => {
              const conf = getConferenceData(event);
              return (
                <Link
                  key={event.id}
                  href={`/?eventId=${event.id}`}
                  className="block"
                >
                  <div
                    className="rounded-2xl p-6 text-center shadow hover:shadow-lg transition"
                    style={{
                      background: `linear-gradient(135deg, ${conf.color}10 0%, ${conf.color}05 100%)`,
                      borderLeft: `4px solid ${conf.color}`,
                    }}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                      <img
                        src={conf.logoSrc}
                        alt={conf.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = '/logos/default.png';
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-bold" style={{ color: conf.color }}>
                      {conf.name}
                    </h3>
                  </div>
                </Link>
              );
            })
          )}
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

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}