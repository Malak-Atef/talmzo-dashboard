// app/print-cards/page.js
'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../useTranslation';
import Link from 'next/link';

export default function PrintCardsPage() {
  const t = useTranslation();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'participants'));
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setParticipants(list);
      } catch (err) {
        console.error('Error loading participants:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, []);

  const handlePrint = () => {
    window.print();
  };

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
          }
          .print-card { 
            break-inside: avoid; 
            page-break-inside: avoid;
          }
        }
        @page { 
          size: A4; 
          margin: 10mm; 
        }
      `}</style>

      {/* رأس الصفحة (غير قابل للطباعة) */}
      <div className="no-print p-6 text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-primary">🖨️</span>
        </div>
        <h1 className="text-3xl font-bold text-dark mb-2">{t('printCards')}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t('printCardsDescription')}
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <button
            onClick={handlePrint}
            className="btn-primary px-6 py-3"
          >
            🖨️ {t('printCards')}
          </button>
          <Link href="/upload-participants" className="btn-secondary px-6 py-3">
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
            <Link href="/upload-participants" className="text-secondary font-medium hover:underline">
              {t('uploadParticipants')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {participants.map((p) => (
              <div
                key={p.id}
                className="print-card border border-gray-200 rounded-xl p-4 text-center bg-white shadow-sm"
                style={{
                  width: '200px',
                  height: '280px',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* شعار Talmzo */}
                <div className="flex justify-center">
                  <img
                    src="/talmzo-logo.png"
                    alt="Talmzo"
                    className="h-8 object-contain"
                  />
                </div>

                {/* الاسم */}
                <div className="mt-2">
                  <h2 className="font-bold text-lg text-dark">{p.name}</h2>
                  {p.team && (
                    <p className="text-sm text-gray-600 mt-1">
                      {p.team}{p.group ? ` • ${p.group}` : ''}
                    </p>
                  )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <QRCode
                    size={100}
                    value={p.qrId}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>

                {/* معرف QR (صغير) */}
                <div className="text-xs text-gray-500 mt-1 font-mono">{p.qrId}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}