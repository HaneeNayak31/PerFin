"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  Target, BarChart2, Sparkles, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Accounts', icon: CreditCard, href: '/accounts' },
  { label: 'Transactions', icon: ArrowLeftRight, href: '/transactions' },
  { label: 'Budgets', icon: Target, href: '/budgets' },
  { label: 'Analytics', icon: BarChart2, href: '/analytics' },
  { label: 'AI Assistant', icon: Sparkles, href: '/ai' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-52 h-screen flex flex-col fixed left-0 top-0 z-50"
      style={{ backgroundColor: '#101828', borderRight: '1px solid #1d2939' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid #1d2939' }}>
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#10B981' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 9L5 6L7 8L10 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">PerFin</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#475467' }}>
          Main
        </p>
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150"
              style={isActive
                ? { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }
                : { color: '#98A2B3' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.color = '#D0D5DD';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#98A2B3';
                }
              }}
            >
              <Icon
                size={14}
                strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? '#10B981' : '#667085', flexShrink: 0 }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer nav */}
      <div className="px-2 pb-2" style={{ borderTop: '1px solid #1d2939', paddingTop: '8px' }}>
        <button
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13px] font-medium transition-all"
          style={{ color: '#98A2B3' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#D0D5DD'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#98A2B3'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <Settings size={14} strokeWidth={2} style={{ color: '#475467' }} />
          Settings
        </button>
        <button
          onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-[13px] font-medium transition-all"
          style={{ color: '#98A2B3' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F97066'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(240, 68, 56, 0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#98A2B3'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <LogOut size={14} strokeWidth={2} style={{ color: '#475467' }} />
          Logout
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #1d2939' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ backgroundColor: '#1d2939', color: '#98A2B3', border: '1px solid #344054' }}
          >
            H
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium leading-tight" style={{ color: '#D0D5DD' }}>Hanee</p>
            <p className="text-[11px] leading-tight" style={{ color: '#475467' }}>Personal Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
