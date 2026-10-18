"use client";

import React from 'react';
import { T } from './theme';

const controlStyle: React.CSSProperties = { backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.ink };
const controlClass = 'w-full px-3 py-2 text-[13px] rounded-lg outline-none focus:border-emerald-500';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-medium mb-1.5" style={{ color: T.ink }}>{label}</span>
      {children}
      {hint && <span className="block text-[11.5px] mt-1" style={{ color: T.mutedLight }}>{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} style={{ ...controlStyle, ...props.style }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} style={{ ...controlStyle, ...props.style }} />;
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="px-3.5 py-2.5 text-[13px] rounded-lg mb-4"
      style={{ backgroundColor: '#FEF3F2', color: '#B42318', border: '1px solid #FECDCA' }}>
      {message}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
      className={`inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-60 ${props.className ?? ''}`}
      style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)', ...props.style }}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props}
      className={`inline-flex items-center justify-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-60 ${props.className ?? ''}`}
      style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.secondary, ...props.style }}>
      {children}
    </button>
  );
}

/** Accepts up to 2 decimal places, matching the API's validation. */
export const AMOUNT_PATTERN = '^\\d{1,12}(\\.\\d{1,2})?$';
export const SIGNED_AMOUNT_PATTERN = '^-?\\d{1,12}(\\.\\d{1,2})?$';
