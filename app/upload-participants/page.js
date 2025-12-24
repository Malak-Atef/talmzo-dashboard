// app/upload-participants/page.js
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTranslation } from '../useTranslation';
import Toast from '../components/Toast';

function UploadParticipantsContent() {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('eventId');

  const [eventData, setEventData] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [manualName, setManualName] = useState('');
  const [manualTeam, setManualTeam] = useState('');
  const [manualGroup, setManualGroup] = useState('');

  useEffect(() => {
    if (!eventId) {
      router.push('/events');
      return;
    }

    const loadEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          setEventData({ id: eventDoc.id, ...eventDoc.data() });
        }
      } catch (err) {
        console.error('Error loading event:', err);
      }
    };

    loadEvent();
  }, [eventId]); // ← فقط eventId

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleFile = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const headers = data[0]?.map(h => String(h).trim().toLowerCase()) || [];
      const startIndex = headers.length > 0 ? 1 : 0;

      const participants = [];
      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;

        const name = String(row[0]).trim();
        const team = (headers.includes('الفرقة') || headers.includes('team'))
          ? String(row[headers.indexOf('الفرقة') || headers.indexOf('team')] || '').trim()
          : t('notSpecified');

        const group = (headers.includes('المجموعة') || headers.includes('group'))
          ? String(row[headers.indexOf('المجموعة') || headers.indexOf('group')] || '').trim()
          : t('notSpecified');

        participants.push({ name, team, group });
      }

      setPreview(participants);
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (preview.length === 0) {
      showToast(t('noValidData'), 'error');
      return;
    }

    setUploading(true);

    try {
      for (const p of preview) {
        const qrId = 'user_' + Math.random().toString(36).substr(2, 9);
        await addDoc(collection(db, 'participants'), {
          eventId,
          name: p.name,
          team: p.team,
          group: p.group,
          qrId: qrId,
          createdAt: serverTimestamp(),
        });
      }
      showToast(t('savedParticipants').replace('{n}', preview.length), 'success');
      setPreview([]);
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      showToast(t('saveFailed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!manualName.trim()) {
      showToast(t('enterFullName'), 'error');
      return;
    }

    try {
      const qrId = 'user_' + Math.random().toString(36).substr(2, 9);
      await addDoc(collection(db, 'participants'), {
        eventId,
        name: manualName.trim(),
        team: manualTeam.trim() || t('notSpecified'),
        group: manualGroup.trim() || t('notSpecified'),
        qrId: qrId,
        createdAt: serverTimestamp(),
      });
      showToast(t('manualAddSuccess'), 'success');
      setManualName('');
      setManualTeam('');
      setManualGroup('');
    } catch (err) {
      console.error('Manual add error:', err);
      showToast(t('manualAddFailed'), 'error');
    }
  };

  if (!eventId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-light flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl">
        {/* رأس الصفحة — زر رجوع احترافي */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push(`/?eventId=${eventId}`)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium flex items-center gap-1"
          >
            ← {t('backToDashboard')}
          </button>
        </div>

        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-accent">👥</span>
          </div>
          <h1 className="text-3xl font-bold text-dark">
            {t('uploadParticipants')} — {eventData?.name || t('unknownEvent')}
          </h1>
          <p className="text-gray-600 mt-2">{t('manageParticipantsDescription')}</p>
        </div>

        {/* رفع من ملف */}
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-sm">📤</span>
            {t('uploadFromExcel')}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t('fileMustContain')}: <strong>{t('name')}</strong>, <strong>{t('team')}</strong>, <strong>{t('group')}</strong>
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
          {preview.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-dark mb-2">
                {t('preview')} ({preview.length})
              </h3>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded bg-gray-50 p-3">
                {preview.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-blue-600">{p.team}</span>
                    <span className="text-green-600">{p.group}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={uploading || preview.length === 0}
            className={`w-full mt-4 py-3 rounded-lg font-bold text-white transition ${
              uploading || preview.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {uploading ? t('saving') : t('saveFromFile')}
          </button>
        </div>

        {/* إضافة يدوية */}
        <div className="bg-white p-6 rounded-2xl shadow border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center text-sm">✍️</span>
            {t('manualAdd')}
          </h2>
          <form onSubmit={handleManualAdd} className="space-y-3">
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder={t('fullName')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <input
              type="text"
              value={manualTeam}
              onChange={(e) => setManualTeam(e.target.value)}
              placeholder={t('teamNameOptional')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <input
              type="text"
              value={manualGroup}
              onChange={(e) => setManualGroup(e.target.value)}
              placeholder={t('groupNameOptional')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              className="w-full py-3 bg-accent text-dark font-bold rounded-lg hover:bg-accent/90 transition"
            >
              {t('addParticipant')}
            </button>
          </form>
        </div>

        {/* زر طباعة الكروت — احترافي */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/print-cards?eventId=${eventId}`)}
            className="inline-flex items-center gap-2 text-secondary font-medium hover:underline hover:text-primary transition"
          >
            👁️ {t('viewPrintCards')}
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

export default function UploadParticipantsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    }>
      <UploadParticipantsContent />
    </Suspense>
  );
}