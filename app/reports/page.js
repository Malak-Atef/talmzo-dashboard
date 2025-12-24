// app/reports/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as XLSX from 'xlsx';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

function ReportsContent() {
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
        // تحميل بيانات المؤتمر
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventDoc.id, ...eventDoc.data() });
        }

        // تحميل الجلسات
        const sessionsSnapshot = await getDocs(
          query(
            collection(db, 'sessions'),
            where('eventId', '==', eventId),
            orderBy('createdAt', 'desc')
          )
        );
        const sessionsList = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // تحميل الحضور
        const attendanceSnapshot = await getDocs(
          query(
            collection(db, 'attendance'),
            where('eventId', '==', eventId)
          )
        );
        const attendanceList = attendanceSnapshot.docs.map(doc => doc.data());

        // دمج البيانات
        const enrichedSessions = sessionsList.map(sess => {
          const sessionAttendance = attendanceList.filter(a => a.sessionId === sess.id);
          const uniqueUsers = [...new Set(sessionAttendance.map(a => a.userId))];
          const totalCheckIns = sessionAttendance.filter(a => a.action === 'check-in').length;
          const totalCheckOuts = sessionAttendance.filter(a => a.action === 'check-out').length;

          return {
            ...sess,
            attendanceCount: uniqueUsers.length,
            totalCheckIns,
            totalCheckOuts,
            attendanceRecords: sessionAttendance,
          };
        });

        setSessions(enrichedSessions);
      } catch (error) {
        console.error('Error loading reports:', error);
        setToast({ message: t('failedToLoadReports'), type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const summaryData = sessions.map(sess => ({
        [t('sessionName')]: sess.sessionName,
        [t('sessionType')]: sess.sessionType,
        [t('group')]: sess.attendanceMode === 'Group' ? sess.groupName : t('allAttendees'),
        [t('attendanceCount')]: sess.attendanceCount,
        [t('totalCheckIns')]: sess.totalCheckIns,
        [t('totalCheckOuts')]: sess.totalCheckOuts,
      }));
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, t('sessionSummary'));

      const detailsData = [];
      sessions.forEach(sess => {
        sess.attendanceRecords.forEach(rec => {
          detailsData.push({
            [t('sessionName')]: sess.sessionName,
            [t('userId')]: rec.userId,
            [t('event')]: rec.action === 'check-in' ? t('checkIn') : t('checkOut'),
            [t('time')]: rec.timestamp?.toDate?.()?.toLocaleString() || t('unknown'),
          });
        });
      });
      const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(workbook, detailsSheet, t('attendanceDetails'));

      const fileName = t('reportFileName') || 'Talmzo_Report.xlsx';
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Excel export error:', err);
      setToast({ message: t('exportFailed'), type: 'error' });
    }
  };

  if (!eventId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-6xl">
        {/* رأس الصفحة — زر رجوع احترافي */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push(`/?eventId=${eventId}`)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium flex items-center gap-1"
          >
            ← {t('backToDashboard')}
          </button>
        </div>

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">
            {t('reports')} — {eventData?.name || t('unknownEvent')}
          </h1>
          <p className="text-gray-600 mt-2">{t('viewAttendanceStatistics')}</p>
        </div>

        {/* زر التصدير */}
        <div className="flex justify-end mb-6">
          <button
            onClick={exportToExcel}
            disabled={loading || sessions.length === 0}
            className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition ${
              loading || sessions.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            📥 {t('exportExcel')}
          </button>
        </div>

        {/* محتوى التقرير */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-gray-600">{t('loadingSessions')}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow border border-gray-100">
            <p className="text-gray-600 text-lg mb-4">{t('noReports')}</p>
            <button
              onClick={() => router.push(`/add-session?eventId=${eventId}`)}
              className="btn-primary px-6 py-2"
            >
              ➕ {t('addSession')}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border-b p-3 text-right font-semibold text-gray-700">{t('sessionName')}</th>
                    <th className="border-b p-3 text-right font-semibold text-gray-700">{t('sessionType')}</th>
                    <th className="border-b p-3 text-right font-semibold text-gray-700">{t('group')}</th>
                    <th className="border-b p-3 text-center font-semibold text-gray-700">{t('attendanceCount')}</th>
                    <th className="border-b p-3 text-center font-semibold text-gray-700">{t('totalCheckIns')}</th>
                    <th className="border-b p-3 text-center font-semibold text-gray-700">{t('totalCheckOuts')}</th>
                    <th className="border-b p-3 text-center font-semibold text-gray-700">{t('details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-gray-50">
                      <td className="border-b p-3 text-right">{sess.sessionName}</td>
                      <td className="border-b p-3 text-right">{sess.sessionType}</td>
                      <td className="border-b p-3 text-right">
                        {sess.attendanceMode === 'Group' ? sess.groupName : t('allAttendees')}
                      </td>
                      <td className="border-b p-3 text-center font-bold">{sess.attendanceCount}</td>
                      <td className="border-b p-3 text-center">{sess.totalCheckIns}</td>
                      <td className="border-b p-3 text-center">{sess.totalCheckOuts}</td>
                      <td className="border-b p-3 text-center">
                        <button
                          onClick={() => router.push(`/reports/session/${sess.id}?eventId=${eventId}`)}
                          className="text-secondary hover:text-primary transition flex items-center justify-center mx-auto w-8 h-8 rounded-full hover:bg-secondary/10"
                          title={t('details')}
                        >
                          👁️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* زر رجوع في الأسفل — احترافي */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/?eventId=${eventId}`)}
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center justify-center gap-1 mx-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
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
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}