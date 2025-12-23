// app/events/page.js
'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Link from 'next/link';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

export default function EventsPage() {
  const t = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState('');
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

    try {
      await addDoc(collection(db, 'events'), {
        name: newEventName.trim(),
        createdAt: serverTimestamp(),
      });
      setNewEventName('');
      // إعادة تحميل القائمة
      const snapshot = await getDocs(collection(db, 'events'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(list);
      setToast({ message: t('eventAddedSuccessfully'), type: 'success' });
    } catch (err) {
      console.error('Error adding event:', err);
      setToast({ message: t('failedToAddEvent'), type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
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
          <form onSubmit={handleAddEvent} className="flex gap-2">
            <input
              type="text"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              placeholder={t('conferenceName')}
              className="flex-1 p-2 border border-gray-300 rounded-lg"
            />
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-lg font-medium"
            >
              ➕
            </button>
          </form>
        </div>

        {/* قائمة المؤتمرات */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center">{t('loading')}</p>
          ) : events.length === 0 ? (
            <p className="text-center text-gray-500">{t('noConferencesYet')}</p>
          ) : (
            events.map(event => (
              <Link
                key={event.id}
                href={`/?eventId=${event.id}`} // نعود للرئيسية مع eventId
                className="block bg-white p-4 rounded-2xl shadow border border-gray-100 hover:shadow-md transition"
              >
                <h3 className="text-xl font-bold text-dark">{event.name}</h3>
                <p className="text-gray-600 text-sm mt-1">
                  {t('eventId')}: {event.id}
                </p>
              </Link>
            ))
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