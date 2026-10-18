"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { T } from './theme';

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}
      style={{ backgroundColor: 'rgba(16,24,40,0.45)' }} onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-xl p-6" onMouseDown={e => e.stopPropagation()}
        style={{ backgroundColor: T.surface, boxShadow: '0 20px 40px rgba(16,24,40,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold" style={{ color: T.ink }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md" style={{ color: T.muted }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
