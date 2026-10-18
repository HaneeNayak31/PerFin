"use client";

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function Topbar() {
  const user = useCurrentUser();
  return (
    <header
      className="h-14 px-6 flex items-center justify-between sticky top-0 z-40"
      style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E4E7EC' }}
    >
      <div className="flex-1 flex items-center max-w-sm">
        <Link href="/transactions"
          className="flex items-center gap-2 px-3 py-1.5 w-full rounded-lg text-[13px] transition-all"
          style={{ backgroundColor: '#F6F8F7', border: '1px solid #E4E7EC', color: '#98A2B3' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D0D5DD'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E7EC'; }}
        >
          <Search size={13} style={{ color: '#98A2B3', flexShrink: 0 }} />
          <span className="flex-1 text-left text-[12.5px]" style={{ color: '#98A2B3' }}>
            Search transactions…
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <div
          title={user?.email ?? ''}
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all"
          style={{
            backgroundColor: '#ECFDF5',
            color: '#047857',
            border: '1.5px solid #A7F3D0',
          }}
        >
          {((user?.name || user?.email || '?').charAt(0)).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
