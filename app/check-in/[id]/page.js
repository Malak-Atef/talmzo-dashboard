'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useTranslation } from '../../useTranslation';

export default function CheckInPage() {
  const t = useTranslation();
  const params = useParams();
  const sessionId = params?.id;
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'offline'

  const handleCheckIn = async () => {
    if (!sessionId) {
      setMessage(`❌ ${t('sessionName')} ${t('invalid') || 'غير صحيح'}`);
      return;
    }

    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    const record = {
      sessionId,
      userId,
      checkIn: new Date().toISOString(),
      mode: 'qr',
    };

    try {
      await addDoc(collection(db, 'attendance'), {
        ...record,
        checkIn: serverTimestamp(),
      });
      setStatus('success');
      setMessage(`✓ ${t('checkIn')} ${t('done') || 'تم!'}`);
    } catch (error) {
      const pending = JSON.parse(localStorage.getItem('pendingAttendance') || '[]');
      pending.push(record);
      localStorage.setItem('pendingAttendance', JSON.stringify(pending));
      setStatus('offline');
      setMessage(`${t('savedTemporarily') || '✓ تم الحفظ مؤقتًا (سيُرفع لاحقًا)'}`);
    }

    setTimeout(() => {
      setMessage('');
      setStatus('idle');
    }, 2000);
  };

  useEffect(() => {
    const syncPending = async () => {
      const pending = JSON.parse(localStorage.getItem('pendingAttendance') || '[]');
      if (pending.length === 0) return;
      if (!navigator.onLine) return;

      try {
        for (const rec of pending) {
          await addDoc(collection(db, 'attendance'), {
            ...rec,
            checkIn: serverTimestamp(),
          });
        }
        localStorage.removeItem('pendingAttendance');
      } catch (err) {
        console.log('Sync failed, keeping pending...');
      }
    };

    syncPending();
    window.addEventListener('online', syncPending);
    return () => window.removeEventListener('online', syncPending);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '0 20px',
        backgroundColor: '#f8fafc',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
        {t('checkIn')}
      </h1>

      <button
        onClick={handleCheckIn}
        disabled={status === 'success' || status === 'offline'}
        style={{
          padding: '14px 32px',
          fontSize: '1.1rem',
          backgroundColor: '#0d9488',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          opacity: status === 'success' || status === 'offline' ? 0.7 : 1,
        }}
      >
        {t('checkIn')} {t('now')}
      </button>

      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: status === 'success' ? '#dcfce7' : '#fef3c7',
            color: status === 'success' ? '#166534' : '#92400e',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '1.1rem',
          }}
        >
          {message}
        </div>
      )}

      <p style={{ marginTop: '40px', fontSize: '0.9rem', color: '#64748b' }}>
        {t('clickOnce')}
      </p>
    </div>
  );
}