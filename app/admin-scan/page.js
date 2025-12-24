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
  const [attendanceRecords, setAttendanceRecords] = useState([]); // ← سجلات الحضور
  const [presentUsers, setPresentUsers] = useState([]); // ← الحاضرون الآن
  const [absentUsers, setAbsentUsers] = useState([]); // ← الغائبون

  // حالة مربع الحوار
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const scanner = useRef(null);

  // تحميل البيانات
  useEffect(() => {
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
            setSessionData(list[0]);
            const eventDoc = await getDoc(doc(db, 'events', list[0].eventId));
            if (eventDoc.exists()) {
              setEventData({ id: eventDoc.id, ...eventDoc.data() });
            }
          }
        }

        const targetEventId = session?.eventId || (sessionsList[0]?.eventId) || eventId;
        if (targetEventId) {
          // تحميل المشاركين
          const participantsQ = query(collection(db, 'participants'), where('eventId', '==', targetEventId));
          const participantsSnap = await getDocs(participantsQ);
          const participantsList = participantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setParticipants(participantsList);

          // تحميل سجلات الحضور
          const attendanceQ = query(
            collection(db, 'attendance'),
            where('eventId', '==', targetEventId),
            where('sessionId', '==', sessionId || sessionsList[0]?.id)
          );
          const attendanceSnap = await getDocs(attendanceQ);
          const attendanceList = attendanceSnap.docs.map(doc => doc.data());
          setAttendanceRecords(attendanceList);

          // تحليل الحضور
          const userStatus = {};
          attendanceList.forEach(rec => {
            if (!userStatus[rec.userId]) {
              userStatus[rec.userId] = 'absent';
            }
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

    loadData();
  }, [eventId, sessionId]);

  // تحديث قوائم الحاضرين والغائبين عند تغيير سجلات الحضور
  useEffect(() => {
    if (!participants.length || !attendanceRecords.length) return;

    const userStatus = {};
    attendanceRecords.forEach(rec => {
      if (!userStatus[rec.userId]) {
        userStatus[rec.userId] = 'absent';
      }
      userStatus[rec.userId] = rec.action === 'check-in' ? 'present' : 'absent';
    });

    const present = participants.filter(p => userStatus[p.qrId] === 'present');
    const absent = participants.filter(p => userStatus[p.qrId] !== 'present');

    setPresentUsers(present);
    setAbsentUsers(absent);
  }, [attendanceRecords, participants]);

  // بدء المسح بالكاميرا
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
        handleScannedUserId(decodedText);
        await html5QrCode.stop();
        setIsScanning(false);
        setTimeout(() => startScanner(), 1500);
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

  // حفظ الحضور
  const saveAttendance = async (userId, actionOverride = null) => {
    const activeSession = sessionData || sessionsList[0];
    if (!eventId || !activeSession) {
      setToast({ message: t('missingEventOrSession'), type: 'error' });
      return;
    }

    try {
      const userQuery = query(collection(db, 'participants'), where('qrId', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      let displayName = userId;
      if (!userSnapshot.empty) {
        const data = userSnapshot.docs[0].data();
        displayName = `${data.name} (${data.team || t('notSpecified')} - ${data.group || t('notSpecified')})`;
      }

      // تحديد الإجراء
      let action = actionOverride;
      if (!action) {
        const userRecords = attendanceRecords.filter(rec => rec.userId === userId);
        const lastRecord = userRecords.length > 0 ? userRecords[userRecords.length - 1] : null;
        action = lastRecord?.action === 'check-in' ? 'check-out' : 'check-in';
      }

      // حفظ السجل
      const newRecord = {
        eventId,
        sessionId: activeSession.id,
        userId,
        userName: displayName,
        action,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, 'attendance'), newRecord);

      // إضافة السجل الجديد إلى القائمة
      setAttendanceRecords(prev => [...prev, newRecord]);

      const actionText = action === 'check-in' ? t('checkIn') : t('checkOut');
      setToast({ message: `${actionText} — ${displayName}`, type: 'success' });

      // ⭐️ إعادة تحميل سجلات الحضور بعد التسجيل
      const attendanceQ = query(
        collection(db, 'attendance'),
        where('eventId', '==', activeSession.eventId),
        where('sessionId', '==', activeSession.id)
      );
      const attendanceSnap = await getDocs(attendanceQ);
      const attendanceList = attendanceSnap.docs.map(doc => doc.data());
      setAttendanceRecords(attendanceList);

    } catch (err) {
      console.error('Error saving attendance:', err);
      setToast({ message: t('failedToSaveAttendance'), type: 'error' });
    }
  };

  // خروج جماعي
  const handleBulkCheckOut = async () => {
    if (presentUsers.length === 0) {
      setToast({ message: t('noOneToCheckOut'), type: 'warning' });
      return;
    }

    // عرض مربع الحوار الاحترافي
    setConfirmAction('bulkCheckOut');
    setShowConfirmModal(true);
  };

  // دخول جماعي
  const handleBulkCheckIn = async () => {
    const selected = absentUsers.filter(u => document.getElementById(`absent-${u.qrId}`)?.checked);
    if (selected.length === 0) {
      setToast({ message: t('selectParticipantsToCheckIn'), type: 'warning' });
      return;
    }

    // عرض مربع الحوار الاحترافي
    setConfirmAction('bulkCheckIn');
    setShowConfirmModal(true);
  };

  // تأكيد الإجراء
  const confirmActionHandler = async () => {
    setLoading(true);
    try {
      if (confirmAction === 'bulkCheckOut') {
        for (const user of presentUsers) {
          await saveAttendance(user.qrId, 'check-out');
        }
        setToast({ message: t('bulkCheckOutSuccess'), type: 'success' });
      } else if (confirmAction === 'bulkCheckIn') {
        const selected = absentUsers.filter(u => document.getElementById(`absent-${u.qrId}`)?.checked);
        for (const user of selected) {
          await saveAttendance(user.qrId, 'check-in');
        }
        setToast({ message: t('bulkCheckInSuccess').replace('{n}', selected.length), type: 'success' });
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setToast({ message: t('bulkCheckOutFailed'), type: 'error' });
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  // إلغاء الإجراء
  const cancelActionHandler = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleSelectSession = (sessId) => {
    const sess = sessionsList.find(s => s.id === sessId);
    if (sess) {
      setSessionData(sess);
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
      <div className="flex justify-between w-full max-w-4xl mb-4">
        <button
          onClick={() => router.push(`/?eventId=${eventId}`)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium"
        >
          ← {t('backToDashboard')}
        </button>
      </div>

      <div className="text-center mb-6 w-full max-w-4xl">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <span className="text-xl text-primary">📱</span>
        </div>
        <h1 className="text-2xl font-bold text-dark">
          {t('adminScan')} — {eventData?.name || t('unknownEvent')}
        </h1>
        <p className="text-gray-600 text-sm mt-1">{t('smartAttendanceControl')}</p>
      </div>

      <div className="w-full max-w-4xl space-y-6">
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            <p className="mt-3 text-gray-600">{t('loadingSessions')}</p>
          </div>
        ) : sessionData ? (
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

            {/* أزرار التحكم الجماعي */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={handleBulkCheckOut}
                disabled={presentUsers.length === 0 || loading}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  presentUsers.length === 0 || loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                🚪 {t('bulkCheckOut')}
              </button>
              <button
                onClick={handleBulkCheckIn}
                disabled={absentUsers.length === 0 || loading}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                  absentUsers.length === 0 || loading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                👥 {t('bulkCheckIn')}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* الحاضرون الآن */}
              <div className="bg-white p-4 rounded-2xl shadow border border-gray-100">
                <h3 className="font-bold text-dark mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-green-100 text-green-600 flex items-center justify-center text-xs">✅</span>
                  {t('presentNow')} ({presentUsers.length})
                </h3>
                {presentUsers.length === 0 ? (
                  <p className="text-center text-gray-500">{t('noOnePresent')}</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {presentUsers.map(p => (
                      <div
                        key={p.qrId}
                        className="flex justify-between items-center p-2 bg-green-50 rounded hover:bg-green-100"
                      >
                        <span>{p.name}</span>
                        <button
                          onClick={() => saveAttendance(p.qrId, 'check-out')}
                          className="text-xs bg-white px-2 py-1 rounded hover:bg-red-50 text-red-600"
                        >
                          {t('checkOut')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* الغائبون */}
              <div className="bg-white p-4 rounded-2xl shadow border border-gray-100">
                <h3 className="font-bold text-dark mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs">⏳</span>
                  {t('absentNow')} ({absentUsers.length})
                </h3>
                {absentUsers.length === 0 ? (
                  <p className="text-center text-gray-500">{t('everyonePresent')}</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {absentUsers.map(p => (
                      <div
                        key={p.qrId}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded hover:bg-gray-100"
                      >
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`absent-${p.qrId}`}
                            className="rounded"
                          />
                          <span>{p.name}</span>
                        </label>
                        <button
                          onClick={() => saveAttendance(p.qrId, 'check-in')}
                          className="text-xs bg-white px-2 py-1 rounded hover:bg-green-50 text-green-600"
                        >
                          {t('checkIn')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : sessionsList.length > 0 ? (
          <div>
            <label className="block font-semibold text-dark mb-2">{t('selectSession')}</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              onChange={(e) => handleSelectSession(e.target.value)}
              value={sessionData?.id || ''}
            >
              <option value="">{t('selectSessionPlaceholder')}</option>
              {sessionsList.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  {sess.sessionName}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('noSessionsAvailable')}</p>
        )}

        <div className="text-center">
          <button
            onClick={() => router.push(`/?eventId=${eventId}`)}
            className="text-secondary font-medium hover:underline"
          >
            ← {t('backToDashboard')}
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

      {/* مربع الحوار الاحترافي */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold text-dark mb-4">
              {confirmAction === 'bulkCheckOut' ? t('confirmBulkCheckOut') : t('confirmBulkCheckIn')}
            </h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelActionHandler}
                className="px-4 py-2 bg-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-300 transition"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmActionHandler}
                className="px-4 py-2 bg-primary rounded-lg font-medium text-white hover:bg-primary/90 transition"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
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