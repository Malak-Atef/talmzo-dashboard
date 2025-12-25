// app/admin-scan/page.js
'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

function AdminScanContent() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');
  const sessionId = searchParams.get('sessionId');

  const [sessionData, setSessionData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);

  // ✅ نحتفظ بسجلات الحضور — ولكن نُحدّثها بشكل ذكي
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [presentUsers, setPresentUsers] = useState([]);
  const [absentUsers, setAbsentUsers] = useState([]);

  const scanner = useRef(null);

  // 🔁 دالة تحميل البيانات (بما في ذلك سجلات الحضور)
  const loadData = async () => {
    if (!eventId && !sessionId) {
      router.push('/events');
      return;
    }

    setLoading(true);
    try {
      let session = null;

      if (sessionId) {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (!sessionDoc.exists()) {
          setToast({ message: t('sessionNotFound'), type: 'error' });
          router.push('/events');
          return;
        }
        session = { id: sessionDoc.id, ...sessionDoc.data() };
        setSessionData(session);

        const eventDoc = await getDoc(doc(db, 'events', session.eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventDoc.id, ...eventDoc.data() });
        }
      } else if (eventId) {
        const q = query(collection(db, 'sessions'), where('eventId', '==', eventId));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessionsList(list);
        if (list.length > 0) {
          session = list[0];
          setSessionData(session);
          const eventDoc = await getDoc(doc(db, 'events', list[0].eventId));
          if (eventDoc.exists()) {
            setEventData({ id: eventDoc.id, ...eventDoc.data() });
          }
        }
      }

      if (session) {
        // تحميل المشاركين
        const participantsQ = query(collection(db, 'participants'), where('eventId', '==', session.eventId));
        const participantsSnap = await getDocs(participantsQ);
        const participantsList = participantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParticipants(participantsList);

        // تحميل سجلات الحضور
        const attendanceQ = query(
          collection(db, 'attendance'),
          where('sessionId', '==', session.id)
        );
        const attendanceSnap = await getDocs(attendanceQ);
        const attendanceList = attendanceSnap.docs.map(doc => doc.data());
        setAttendanceRecords(attendanceList);

        // تحليل الحضور
        const userStatus = {};
        attendanceList.forEach(rec => {
          userStatus[rec.userId] = rec.action === 'check-in' ? 'present' : 'absent';
        });

        const present = participantsList.filter(p => userStatus[p.qrId] === 'present');
        const absent = participantsList.filter(p => userStatus[p.qrId] !== 'present');

        setPresentUsers(present);
        setAbsentUsers(absent);
      }
    } catch (err) {
      console.error('Error loading ', err);
      setToast({ message: t('failedToLoadSessions'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, sessionId]);

  // الكاميرا
  const startScanner = async () => {
    if (!sessionData) {
      setToast({ message: t('selectSessionFirst'), type: 'error' });
      return;
    }

    const readerElement = document.getElementById('qr-reader');
    if (!readerElement) return;

    if (scanner.current) {
      await scanner.current.stop().catch(() => {});
      scanner.current = null;
    }

    setIsScanning(true);
    setToast(null);

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scanner.current = html5QrCode;

      const qrCodeSuccessCallback = async (decodedText) => {
        if (decodedText) {
          // ✅ التأكد أن القيمة ليست فارغة
          handleScannedUserId(decodedText.trim());
        }
        await html5QrCode.stop();
        setIsScanning(false);
        setTimeout(() => startScanner(), 500);
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 250, height: 250 } },
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

  // ✅ تسجيل الحضور — بشكل دقيق
  const handleScannedUserId = async (qrId) => {
    if (!sessionData || !eventId) return;

    // التحقق من أن المستخدم موجود
    const user = participants.find(p => p.qrId === qrId);
    if (!user) {
      setToast({ message: t('participantNotFound'), type: 'error' });
      return;
    }

    // اهتزاز فوري
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }

    // تحديد الإجراء
    const userRecords = attendanceRecords.filter(rec => rec.userId === qrId);
    const lastRecord = userRecords.length > 0 ? userRecords[userRecords.length - 1] : null;
    const action = lastRecord?.action === 'check-in' ? 'check-out' : 'check-in';

    // حفظ السجل
    const displayName = `${user.name} (${user.team || t('notSpecified')} - ${user.group || t('notSpecified')})`;
    await addDoc(collection(db, 'attendance'), {
      eventId,
      sessionId: sessionData.id,
      userId: qrId,
      userName: displayName,
      action,
      timestamp: serverTimestamp(),
    });

    // ✅ تحديث محلي فوري (بدون إعادة تحميل كامل)
    const newRecord = { eventId, sessionId: sessionData.id, userId: qrId, userName: displayName, action, timestamp: new Date() };
    setAttendanceRecords(prev => [...prev, newRecord]);

    if (action === 'check-in') {
      setPresentUsers(prev => [...prev, user]);
      setAbsentUsers(prev => prev.filter(u => u.qrId !== qrId));
    } else {
      setPresentUsers(prev => prev.filter(u => u.qrId !== qrId));
      setAbsentUsers(prev => [...prev, user]);
    }

    setToast({ message: `${action === 'check-in' ? t('checkIn') : t('checkOut')} — ${user.name}`, type: 'success' });
  };

  const handleManualCheckIn = (qrId) => {
    handleScannedUserId(qrId);
  };

  const handleSelectSession = (sessId) => {
    const sess = sessionsList.find(s => s.id === sessId);
    if (sess) {
      setSessionData(sess);
      // إعادة تحميل البيانات للجلسة الجديدة
      loadData();
    }
  };

  if (!eventId && !sessionId) {
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
    <div className="min-h-screen bg-light flex flex-col items-center py-6 px-4">
      <button
        onClick={() => router.push(`/?eventId=${eventId}`)}
        className="self-start mb-2 px-3 py-1 bg-white rounded shadow text-sm"
      >
        ← {t('backToDashboard')}
      </button>

      <div className="text-center mb-4 w-full">
        <h1 className="text-xl font-bold text-dark">
          {t('adminScan')} — {eventData?.name || t('unknownEvent')}
        </h1>
      </div>

      <div className="w-full max-w-md space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
          </div>
        ) : sessionData ? (
          <>
            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="font-bold mb-2">{t('scanQR')}</h3>
              <div className="relative bg-gray-900 rounded-lg h-56">
                <div id="qr-reader" className="w-full h-full"></div>
                {!isScanning && (
                  <button
                    onClick={startScanner}
                    className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded z-10"
                  >
                    📷 {t('openCamera')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* الحاضرون الآن */}
              <div className="bg-white p-3 rounded-lg">
                <h4 className="font-bold text-green-600">{t('presentNow')} ({presentUsers.length})</h4>
                <div className="max-h-32 overflow-y-auto mt-1">
                  {presentUsers.map(p => (
                    <div key={p.qrId} className="text-sm py-1 flex justify-between">
                      <span>{p.name}</span>
                      <button
                        onClick={() => handleScannedUserId(p.qrId)}
                        className="text-xs text-red-600"
                      >
                        {t('checkOut')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* الغائبون */}
              <div className="bg-white p-3 rounded-lg">
                <h4 className="font-bold text-gray-600">{t('absentNow')} ({absentUsers.length})</h4>
                <div className="max-h-32 overflow-y-auto mt-1">
                  {absentUsers.map(p => (
                    <div key={p.qrId} className="text-sm py-1 flex justify-between">
                      <span>{p.name}</span>
                      <button
                        onClick={() => handleScannedUserId(p.qrId)}
                        className="text-xs text-green-600"
                      >
                        {t('checkIn')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : sessionsList.length > 0 ? (
          <select
            className="w-full p-2 border rounded"
            onChange={(e) => handleSelectSession(e.target.value)}
            value={sessionData?.id || ''}
          >
            <option value="">{t('selectSession')}</option>
            {sessionsList.map(s => (
              <option key={s.id} value={s.id}>{s.sessionName}</option>
            ))}
          </select>
        ) : (
          <p className="text-center text-gray-500">{t('noSessionsAvailable')}</p>
        )}

        <div className="text-center">
          <button
            onClick={() => router.push(`/?eventId=${eventId}`)}
            className="text-sm text-secondary"
          >
            ← {t('backToDashboard')}
          </button>
        </div>
      </div>

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