import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F6F8F7' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: '208px' }}>
        <Topbar />
        <main className="flex-1 px-8 py-7">
          <div style={{ maxWidth: '1180px', width: '100%', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
