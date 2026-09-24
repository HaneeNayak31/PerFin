"use client";

import React from 'react';
import { Search, Bell } from 'lucide-react';

export default function Topbar() {
  return (
    <header
      className="h-14 px-6 flex items-center justify-between sticky top-0 z-40"
      style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E4E7EC' }}
    >
      <div className="flex-1 flex items-center max-w-sm">
        <button
          className="flex items-center gap-2 px-3 py-1.5 w-full rounded-lg text-[13px] transition-all"
          style={{ backgroundColor: '#F6F8F7', border: '1px solid #E4E7EC', color: '#98A2B3' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D0D5DD'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E4E7EC'; }}
        >
          <Search size={13} style={{ color: '#98A2B3', flexShrink: 0 }} />
          <span className="flex-1 text-left text-[12.5px]" style={{ color: '#98A2B3' }}>
            Search transactions, accounts…
          </span>
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded leading-none"
            style={{ color: '#98A2B3', backgroundColor: '#FFFFFF', border: '1px solid #E4E7EC' }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ color: '#667085' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F6F8F7'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <Bell size={16} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: '#F04438' }}
          />
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold cursor-pointer transition-all"
          style={{
            backgroundColor: '#ECFDF5',
            color: '#047857',
            border: '1.5px solid #A7F3D0',
          }}
        >
          H
        </div>
      </div>
    </header>
  );
}
