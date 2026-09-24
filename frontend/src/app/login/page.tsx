"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { Lock, Mail, ArrowRight, TrendingUp } from 'lucide-react';

const T = {
  ink: '#101828', muted: '#667085', mutedLight: '#98A2B3',
  border: '#E4E7EC', brandDark: '#047857', brand: '#10B981',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.accessToken) {
        localStorage.setItem('token', res.data.accessToken);
        router.push('/dashboard');
      }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F6F8F7' }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ backgroundColor: T.ink }}>
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full" style={{ backgroundColor: T.brand, filter: 'blur(120px)' }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: T.brand }}>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M2 9L5 6L7 8L10 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[17px] font-semibold text-white tracking-tight">PerFin</span>
          </div>
        </div>
        <div className="relative z-10">
          <blockquote className="text-[24px] font-semibold text-white leading-snug mb-6 max-w-md">
            "Financial clarity starts with understanding where your money goes."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1d2939' }}>
              <TrendingUp size={18} style={{ color: T.brand }} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-white">Spend Smarter</p>
              <p className="text-[12px]" style={{ color: '#475467' }}>Live Freer</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[{ l: 'Users', v: '10K+' }, { l: 'Tracked', v: '₹50Cr+' }, { l: 'Saved', v: '₹8Cr+' }].map(s => (
            <div key={s.l} className="rounded-xl p-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[18px] font-bold text-white">{s.v}</p>
              <p className="text-[11px]" style={{ color: '#475467' }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col justify-center w-full lg:w-[55%] p-8 lg:p-16">
        <div className="max-w-sm w-full mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: T.brand }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 9L5 6L7 8L10 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: T.ink }}>PerFin</span>
          </div>

          <h1 className="text-[24px] font-bold tracking-tight mb-1" style={{ color: T.ink }}>Welcome back</h1>
          <p className="text-[14px] mb-7" style={{ color: T.muted }}>Sign in to your PerFin account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="px-3.5 py-2.5 text-[13px] rounded-lg" style={{ backgroundColor: '#FEF3F2', color: '#F04438', border: '1px solid #FECDCA' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: T.ink }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedLight }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-lg outline-none transition-all"
                  style={{ backgroundColor: '#FFFFFF', border: `1px solid ${T.border}`, color: T.ink }}
                  onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = T.brand; }}
                  onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }} />
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1.5" style={{ color: T.ink }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedLight }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-lg outline-none transition-all"
                  style={{ backgroundColor: '#FFFFFF', border: `1px solid ${T.border}`, color: T.ink }}
                  onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = T.brand; }}
                  onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }} />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold text-white py-2.5 px-4 rounded-lg transition-all disabled:opacity-60"
              style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#065F46'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.brandDark; }}>
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
