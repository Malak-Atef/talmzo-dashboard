// app/print-cards/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../useTranslation';
import Link from 'next/link';

function PrintCardsContent() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    if (!eventId) {
      router.push('/events');
      return;
    }

    const fetchEventAndParticipants = async () => {
      try {
        // تحميل بيانات المؤتمر مباشرة باستخدام eventId كـ معرف
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventDoc.id, ...eventDoc.data() });
        } else {
          setEventData(null);
        }

        // تحميل المشاركين التابعين لهذا المؤتمر
        const q = query(
          collection(db, 'participants'),
          where('eventId', '==', eventId)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setParticipants(list);
      } catch (err) {
        console.error('Error loading participants or event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndParticipants();
  }, [eventId, router, t]);

  const handlePrint = () => {
    window.print();
  };

  if (!eventId) {
    return null;
  }

  return (
    <div>
      {/* تعديلات الطباعة */}
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            margin: 0; 
            padding: 0; 
            background: white !important;
            font-family: 'Tajawal', sans-serif;
          }
          .print-card { 
            break-inside: avoid; 
            page-break-inside: avoid;
          }
        }
        @page { 
          size: A4 landscape;
          margin: 10mm; 
        }
        body {
          font-family: 'Tajawal', sans-serif;
        }
      `}</style>

      {/* رأس الصفحة (غير قابل للطباعة) */}
      <div className="no-print p-6 text-center mb-8">
        <div className="text-end w-full max-w-4xl mx-auto mb-4">
          <Link
            href={`/?eventId=${eventId}`}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:underline"
          >
            ← {t('backToDashboard')}
          </Link>
        </div>

        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-primary">🖨️</span>
        </div>
        <h1 className="text-3xl font-bold text-dark">
          {t('printCards')} — {eventData?.name || t('unknownEvent')}
        </h1>
        {eventData?.name && (
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('forConference')}: <strong>{eventData.name}</strong>
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <button
            onClick={handlePrint}
            className="btn-primary px-6 py-3"
          >
            🖨️ {t('printCards')}
          </button>
          <Link
            href={`/upload-participants?eventId=${eventId}`}
            className="btn-secondary px-6 py-3"
          >
            {t('uploadParticipants')}
          </Link>
        </div>
      </div>

      {/* منطقة الطباعة */}
      <div className="p-4 print-container">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-gray-600">{t('loadingSessions')}</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">{t('noCardsMessage')}</p>
            <Link
              href={`/upload-participants?eventId=${eventId}`}
              className="text-secondary font-medium hover:underline"
            >
              {t('uploadParticipants')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {participants.map((p) => (
              <div
                key={p.id}
                className="print-card bg-white border border-gray-300 rounded-lg p-3 shadow-sm"
                style={{
                  width: '320px',
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  direction: 'ltr',
                }}
              >
                {/* الشعار على اليسار */}
                <div className="flex-shrink-0">
                  <img
                    src="/talmzo-logo.png"
                    alt="Talmzo"
                    className="h-12 object-contain"
                  />
                </div>

                {/* المعلومات المركزية */}
                <div className="flex-1 text-center px-3">
                  <h2
                    className="font-bold text-dark mb-1"
                    style={{ fontFamily: 'Tajawal, sans-serif', fontSize: '18px' }}
                  >
                    {p.name}
                  </h2>
                  <div
                    className="text-left text-gray-700"
                    style={{ fontFamily: 'Tajawal, sans-serif', fontSize: '14px' }}
                  >
                    {p.team && (
                      <div>
                        <span className="font-semibold">فرقة:</span> {p.team}
                      </div>
                    )}
                    {p.group && (
                      <div>
                        <span className="font-semibold">مجموعة:</span> {p.group}
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code على اليمين */}
                <div className="flex-shrink-0">
                <QRCode
                  size={120}
                  value={p.qrId}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  style={{ width: "120px", height: "250px" }} // ← نفس العرض والارتفاع
                />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintCardsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    }>
      <PrintCardsContent />
    </Suspense>
  );
}