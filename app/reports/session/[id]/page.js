// app/reports/session/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import Link from 'next/link';
import { useTranslation } from '../../../useTranslation';
import Toast from '../../../components/Toast';

export default function SessionReportDetail() {
  const t = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = params?.id;
  const eventId = searchParams.get('eventId');

  const [sessionData, setSessionData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // إذا ما وُجد eventId، نوجه إلى صفحة المؤتمرات
  useEffect(() => {
    if (!eventId) {
      router.push('/events');
      return;
    }
  }, [eventId, router]);

  useEffect(() => {
    if (!sessionId || !eventId) return;

    const fetchData = async () => {
      try {
        // تحميل بيانات الجلسة
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          setSessionData(null);
          setToast({ message: t('sessionNotFound'), type: 'error' });
          setLoading(false);
          return;
        }

        const session = { id: sessionSnap.id, ...sessionSnap.data() };
        // التحقق من أن الجلسة تنتمي للمؤتمر الحالي
        if (session.eventId !== eventId) {
          setSessionData(null);
          setToast({ message: t('sessionNotBelongToEvent'), type: 'error' });
          setLoading(false);
          return;
        }

        setSessionData(session);

        // تحميل سجلات الحضور الخاصة بالمؤتمر والجلسة
        const q = query(
          collection(db, 'attendance'),
          where('sessionId', '==', sessionId),
          where('eventId', '==', eventId),
          orderBy('timestamp', 'asc')
        );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          time: doc.data().timestamp?.toDate?.()?.toLocaleString() || t('unknown'),
        }));
        setAttendanceRecords(records);

        // حساب الملخص
        const userMap = {};
        records.forEach((rec) => {
          if (!userMap[rec.userId]) {
            userMap[rec.userId] = { checkIns: [], checkOuts: [] };
          }
          if (rec.action === 'check-in') {
            userMap[rec.userId].checkIns.push(rec.timestamp?.toDate?.() || new Date());
          } else if (rec.action === 'check-out') {
            userMap[rec.userId].checkOuts.push(rec.timestamp?.toDate?.() || new Date());
          }
        });

        const summaryData = {};
        for (const userId in userMap) {
          const { checkIns, checkOuts } = userMap[userId];
          let totalMinutes = 0;

          for (let i = 0; i < Math.min(checkIns.length, checkOuts.length); i++) {
            const inTime = checkIns[i];
            const outTime = checkOuts[i];
            if (outTime > inTime) {
              totalMinutes += (outTime - inTime) / (1000 * 60);
            }
          }

          if (checkIns.length > checkOuts.length) {
            const lastIn = checkIns[checkIns.length - 1];
            const now = new Date();
            totalMinutes += (now - lastIn) / (1000 * 60);
          }

          summaryData[userId] = {
            checkIns: checkIns.length,
            checkOuts: checkOuts.length,
            totalMinutes: Math.round(totalMinutes),
          };
        }

        setSummary(summaryData);
      } catch (error) {
        console.error('Error loading session details:', error);
        setToast({ message: t('failedToLoadSessionDetails'), type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, eventId, t]);

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
            href={`/reports?eventId=${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
          >
            ← {t('backToReports')}
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl text-primary">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-dark">{t('sessionDetails')}</h1>
        </div>

        {/* محتوى التفاصيل */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        ) : !sessionData ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow border border-gray-100">
            <p className="text-red-600 text-lg">{t('sessionNotFound')}</p>
            <Link href={`/reports?eventId=${eventId}`} className="text-secondary font-medium mt-4 inline-block hover:underline">
              ← {t('backToReports')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* معلومات الجلسة */}
            <div className="bg-white p-5 rounded-2xl shadow border border-gray-100">
              <h2 className="text-xl font-bold text-dark mb-2">{sessionData.sessionName}</h2>
              <p className="text-gray-600">
                <span className="font-medium">{t('sessionType')}:</span> {sessionData.sessionType}
              </p>
              {sessionData.attendanceMode === 'Group' && sessionData.groupName && (
                <p className="text-gray-600">
                  <span className="font-medium">{t('group')}:</span> {sessionData.groupName}
                </p>
              )}
            </div>

            {/* ملخص الحضور */}
            <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-dark">{t('attendanceSummary')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border-b p-3 text-right font-semibold text-gray-700">{t('userId')}</th>
                      <th className="border-b p-3 text-center font-semibold text-gray-700">{t('checkInCount')}</th>
                      <th className="border-b p-3 text-center font-semibold text-gray-700">{t('checkOutCount')}</th>
                      <th className="border-b p-3 text-center font-semibold text-gray-700">{t('totalTimeMinutes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-gray-500">{t('noAttendanceRecords')}</td>
                      </tr>
                    ) : (
                      Object.entries(summary).map(([userId, data]) => (
                        <tr key={userId} className="hover:bg-gray-50">
                          <td className="border-b p-3 text-right font-mono text-sm">{userId}</td>
                          <td className="border-b p-3 text-center">{data.checkIns}</td>
                          <td className="border-b p-3 text-center">{data.checkOuts}</td>
                          <td className="border-b p-3 text-center font-bold">{data.totalMinutes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* السجلات الكاملة */}
            <div className="bg-white rounded-2xl shadow border border-gray-100">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-dark">{t('fullRecords')}</h3>
              </div>
              <div className="p-4 space-y-3">
                {attendanceRecords.length === 0 ? (
                  <p className="text-center text-gray-500">{t('noRecords')}</p>
                ) : (
                  attendanceRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-mono text-sm text-gray-700">{rec.userId}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                          rec.action === 'check-in' ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      >
                        {rec.action === 'check-in' ? t('checkIn') : t('checkOut')}
                      </span>
                      <span className="text-gray-600 text-sm">{rec.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* رجوع للتقارير */}
            <div className="text-center">
              <Link
                href={`/reports?eventId=${eventId}`}
                className="inline-flex items-center gap-1 text-secondary font-medium hover:underline"
              >
                ← {t('backToReports')}
              </Link>
            </div>
          </div>
        )}
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