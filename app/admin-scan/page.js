// app/admin-scan/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import Link from 'next/link';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

export default function AdminScanPage() {
  const t = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const q = query(collection(db, 'sessions'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setSessions(list);
      } catch (err) {
        console.error('Error loading sessions:', err);
        setToast({ message: t('failedToLoadSessions'), type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [t]);

  const startScanner = () => {
    if (!selectedSession) {
      setToast({ message: t('selectSessionFirst'), type: 'error' });
      return;
    }
    if (!videoRef.current) return;

    setIsScanning(true);

    qrScannerRef.current = new QrScanner(
      videoRef.current,
      (result) => {
        handleScannedUserId(result.data);
        qrScannerRef.current?.stop();
        setIsScanning(false);
        setTimeout(() => {
          if (qrScannerRef.current) {
            qrScannerRef.current.start();
          }
        }, 1500);
      },
      {
        onDecodeError: () => {},
        highlightScanRegion: true,
        highlightCodeOutline: true,
        workerPath: '/qr-scanner-worker.min.js',
      }
    );

    qrScannerRef.current
      .start()
      .catch((err) => {
        console.error('Camera error:', err);
        setToast({ message: t('cameraAccessDenied'), type: 'error' });
        setIsScanning(false);
      });
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const handleScannedUserId = async (userId) => {
    if (!selectedSession || !userId) return;

    let displayName = userId;
    try {
      const userQuery = query(collection(db, 'participants'), where('qrId', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const data = userSnapshot.docs[0].data();
        const team = data.team || t('notSpecified');
        const group = data.group || t('notSpecified');
        displayName = `${data.name} (${team} - ${group})`;
      }
    } catch (err) {
      console.warn('Participant not found:', userId);
    }

    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('sessionId', '==', selectedSession.id),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(attendanceQuery);
      const records = snapshot.docs.map((doc) => doc.data());
      const lastRecord = records.length > 0 ? records[records.length - 1] : null;

      const action = lastRecord?.action === 'check-in' ? 'check-out' : 'check-in';
      const actionText = action === 'check-in' ? t('checkIn') : t('checkOut');

      await addDoc(collection(db, 'attendance'), {
        sessionId: selectedSession.id,
        userId: userId,
        action: action,
        timestamp: serverTimestamp(),
      });

      setToast({ message: `${actionText} — ${displayName}`, type: 'success' });
    } catch (err) {
      console.error('Error saving attendance:', err);
      setToast({ message: t('failedToSaveAttendance'), type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-6 px-4">
      {/* رأس الصفحة */}
      <div className="text-center mb-6 w-full max-w-md">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl text-primary">📱</span>
        </div>
        <h1 className="text-2xl font-bold text-dark">{t('adminScan')}</h1>
        <p className="text-gray-600 text-sm mt-1">{t('scanParticipantQR')}</p>
      </div>

      <div className="w-full max-w-md">
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            <p className="mt-3 text-gray-600">{t('loadingSessions')}</p>
          </div>
        ) : (
          <>
            {/* اختيار الجلسة */}
            <div className="mb-5">
              <label className="block font-semibold text-dark mb-2">{t('selectSession')}</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                value={selectedSession?.id || ''}
                onChange={(e) => {
                  const sess = sessions.find((s) => s.id === e.target.value);
                  setSelectedSession(sess);
                  if (qrScannerRef.current && isScanning) {
                    qrScannerRef.current.stop();
                    setIsScanning(false);
                  }
                }}
              >
                <option value="">{t('selectSessionPlaceholder')}</option>
                {sessions.map((sess) => (
                  <option key={sess.id} value={sess.id}>
                    {sess.sessionName}
                  </option>
                ))}
              </select>
            </div>

            {/* عرض الكاميرا */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-5" style={{ height: '320px' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
              {!isScanning && selectedSession && (
                <button
                  onClick={startScanner}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition z-10"
                >
                  {t('startScanning')}
                </button>
              )}
            </div>

            <p className="text-center text-gray-500 text-sm">{t('scanQR')}</p>
          </>
        )}

        {/* رجوع للرئيسية */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-secondary font-medium hover:underline flex items-center justify-center gap-1">
            ← {t('backToHome')}
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