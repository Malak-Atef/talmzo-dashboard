// app/admin-scan/page.js
'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import Link from 'next/link';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

function AdminScanContent() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const sessionIdFromUrl = searchParams.get('sessionId');

  // ✅ حالة مستقرة: id الجلسة المطلوبة (من الرابط أو null)
  const [targetSessionId] = useState(sessionIdFromUrl || null);
  const [sessionData, setSessionData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);

  const scanner = useRef(null);

  // ✅ تحميل الجلسة + المشاركين في مرة واحدة
  useEffect(() => {
    const loadData = async () => {
      if (!targetSessionId) {
        setLoading(false);
        return;
      }

      try {
        // تحميل بيانات الجلسة
        const sessionDoc = await getDoc(doc(db, 'sessions', targetSessionId));
        if (!sessionDoc.exists()) {
          setToast({ message: t('sessionNotFound'), type: 'error' });
          setLoading(false);
          return;
        }
        const session = { id: sessionDoc.id, ...sessionDoc.data() };
        setSessionData(session);

        // تحميل جميع المشاركين (لا نحتاج تصفية هنا)
        const q = query(collection(db, 'participants'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setParticipants(list);
      } catch (err) {
        console.error('Error loading session or participants:', err);
        setToast({ message: t('failedToLoadSessions'), type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [targetSessionId, t]);

  // تحميل قائمة الجلسات (فقط لو دخلت من /admin-scan بدون sessionId)
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    if (targetSessionId === null) {
      const loadSessions = async () => {
        try {
          const q = query(collection(db, 'sessions'));
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setSessions(list);
        } catch (err) {
          console.error('Error loading sessions:', err);
          setToast({ message: t('failedToLoadSessions'), type: 'error' });
        }
      };
      loadSessions();
    }
  }, [targetSessionId]);

  // بدء المسح بالكاميرا
  const startScanner = async () => {
    if (!sessionData) {
      setToast({ message: t('selectSessionFirst'), type: 'error' });
      return;
    }

    const readerElement = document.getElementById('qr-reader');
    if (!readerElement) return;

    setIsScanning(true);
    setToast(null);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scanner.current = html5QrCode;

      const qrCodeSuccessCallback = async (decodedText) => {
        handleScannedUserId(decodedText);
        html5QrCode.stop().then(() => {
          setIsScanning(false);
          setTimeout(() => startScanner(), 1500);
        });
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        qrCodeSuccessCallback,
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setToast({ message: t('cameraAccessDenied'), type: 'error' });
      setIsScanning(false);
    }
  };

  // تنظيف عند الخروج
  useEffect(() => {
    return () => {
      if (scanner.current) {
        scanner.current.stop().catch(() => {});
      }
    };
  }, []);

  // منطق تسجيل الحضور
  const handleScannedUserId = async (userId) => {
    await saveAttendance(userId);
  };

  const handleManualCheckIn = async (userId, name) => {
    await saveAttendance(userId, name);
  };

  const saveAttendance = async (userId, displayNameFallback = null) => {
    if (!sessionData || !userId) return;

    let displayName = displayNameFallback || userId;
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
        where('sessionId', '==', sessionData.id),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(attendanceQuery);
      const records = snapshot.docs.map((doc) => doc.data());
      const lastRecord = records.length > 0 ? records[records.length - 1] : null;

      const action = lastRecord?.action === 'check-in' ? 'check-out' : 'check-in';
      const actionText = action === 'check-in' ? t('checkIn') : t('checkOut');

      await addDoc(collection(db, 'attendance'), {
        sessionId: sessionData.id,
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
      <div className="text-center mb-6 w-full max-w-md">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl text-primary">📱</span>
        </div>
        <h1 className="text-2xl font-bold text-dark">{t('adminScan')}</h1>
        <p className="text-gray-600 text-sm mt-1">
          {t('scanOrSelectParticipant')}
        </p>
      </div>

      <div className="w-full max-w-md space-y-6">
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            <p className="mt-3 text-gray-600">{t('loadingSessions')}</p>
          </div>
        ) : sessionData ? (
          // عرض الكاميرا + القائمة اليدوية
          <>
            {/* الكاميرا */}
            <div className="bg-white p-4 rounded-2xl shadow border border-gray-100">
              <h3 className="font-bold text-dark mb-3">{t('scanQR')}</h3>
              <div className="relative bg-gray-900 rounded-xl overflow-hidden h-64">
                <div id="qr-reader" className="w-full h-full"></div>
                {!isScanning && (
                  <button
                    onClick={startScanner}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-5 py-2 rounded-lg font-medium z-10"
                  >
                    📷 {t('openCamera')}
                  </button>
                )}
              </div>
            </div>

            {/* القائمة اليدوية */}
            <div className="bg-white p-4 rounded-2xl shadow border border-gray-100">
              <h3 className="font-bold text-dark mb-3">
                {t('selectParticipantManually')}
              </h3>
              {participants.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {participants.map((p) => (
                    <div
                      key={p.qrId}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <span>{p.name}</span>
                      <button
                        onClick={() => handleManualCheckIn(p.qrId, p.name)}
                        className="btn-primary px-3 py-1 text-sm"
                      >
                        {t('checkIn')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">{t('noParticipants')}</p>
              )}
            </div>
          </>
        ) : targetSessionId === null ? (
          // عرض قائمة الجلسات فقط لو دخلت من الرابط المباشر
          <div>
            <label className="block font-semibold text-dark mb-2">
              {t('selectSession')}
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              value={sessions.length > 0 && sessions[0]?.id ? sessions[0].id : ''}
              onChange={(e) => {
                const sess = sessions.find((s) => s.id === e.target.value);
                if (sess) {
                  // تغيير الرابط لتضمين sessionId (لتحسين الاستخدام)
                  window.location.href = `/admin-scan?sessionId=${sess.id}`;
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
        ) : null}

        <div className="text-center">
          <Link
            href="/"
            className="text-secondary font-medium hover:underline flex items-center justify-center gap-1"
          >
            ← {t('backToHome')}
          </Link>
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

export default function AdminScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    }>
      <AdminScanContent />
    </Suspense>
  );
}