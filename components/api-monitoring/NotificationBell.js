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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-600 transition-all text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {/* Icône cloche vectorielle SVG professionnelle */}
        <svg
          className="w-4 h-4 text-slate-300 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
