'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusPageConfig from '@/components/api-monitoring/StatusPageConfig';
import NotificationBell from '@/components/api-monitoring/NotificationBell';

export default function StatusPageConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    }

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
            <span>←</span>
            <span className="text-xs font-semibold uppercase tracking-wider">Retour Dashboard</span>
          </Link>
          <span className="text-slate-600">|</span>
          <span className="font-bold text-lg text-white">APIWatch</span>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <span className="text-sm text-slate-300 hidden sm:inline">
              {user.name} <span className="text-slate-500">({user.email})</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-600"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <StatusPageConfig />
      </main>
    </div>
  );
}
