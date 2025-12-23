// app/reports/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as XLSX from 'xlsx';
import Link from 'next/link';
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

  // إذا ما وُجد eventId، نوجه إلى صفحة المؤتمرات
  useEffect(() => {
    if (!eventId) {
      router.push('/events');
      return;
    }

    const fetchAllData = async () => {
      try {
        // تحميل الجلسات الخاصة بالمؤتمر
        const sessionsSnapshot = await getDocs(
          query(
            collection(db, 'sessions'),
            where('eventId', '==', eventId),
            orderBy('createdAt', 'desc')
          )
        );
        const sessionsList = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // تحميل سجلات الحضور الخاصة بالمؤتمر
        const attendanceSnapshot = await getDocs(
          query(
            collection(db, 'attendance'),
            where('eventId', '==', eventId)
          )
        );
        const attendanceList = attendanceSnapshot.docs.map(doc => doc.data());

        // تحسين بيانات الجلسات
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
        setToast({ message: t('failedToLoadReports') || 'فشل تحميل التقارير', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [eventId, t, router]);

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
        {/* رأس الصفحة */}
        <div className="text-end mb-4">
          <Link
            href={`/?eventId=${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
          >
            ← {t('backToDashboard')}
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-green-600">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">{t('reports')}</h1>
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
            <Link href={`/add-session?eventId=${eventId}`} className="btn-primary px-6 py-2">
              {t('addSession')}
            </Link>
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
                        <Link
                          href={`/reports/session/${sess.id}?eventId=${eventId}`}
                          className="text-secondary font-medium hover:underline"
                        >
                          {t('details')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* رجوع للرئيسية */}
        <div className="mt-8 text-center">
          <Link href={`/?eventId=${eventId}`} className="text-gray-600 hover:text-gray-900 font-medium flex items-center justify-center gap-1">
            ← {t('backToDashboard')}
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