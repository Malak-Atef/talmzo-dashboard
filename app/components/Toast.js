// app/components/Toast.js
'use client';

import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const classes = `${bgColor} text-white px-4 py-2 rounded-md shadow-lg transition-opacity duration-300`;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className={classes}>
        {message}
      </div>
    </div>
  );
}