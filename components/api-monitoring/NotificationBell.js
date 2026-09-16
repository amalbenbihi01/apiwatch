'use client';

import { useState } from 'react';
import { useUnreadNotificationCount } from '@/hooks/use-in-app-notifications';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-600 focus:outline-none"
        aria-label="Notifications"
      >
        <span className="text-base">🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-slate-900 shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
