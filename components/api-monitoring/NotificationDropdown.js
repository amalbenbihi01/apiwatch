'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useInAppNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/use-in-app-notifications';

export default function NotificationDropdown({ isOpen, onClose }) {
  const router = useRouter();
  const dropdownRef = useRef(null);

  const { data, isLoading } = useInAppNotifications({ page: 1, limit: 5 });
  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const notifications = data?.notifications || [];

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    onClose();
    if (notif.endpointId) {
      router.push(`/dashboard/apis/${notif.endpointId}`);
    }
  };

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markAllReadMutation.mutate();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden font-sans"
    >
      {/* Dropdown Header */}
      <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
        <button
          onClick={handleMarkAllRead}
          disabled={markAllReadMutation.isPending}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Tout marquer comme lu
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
            Chargement des notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center space-y-1">
            <span className="text-xl">🔔</span>
            <p className="text-xs font-medium text-slate-300">Aucune notification</p>
            <p className="text-[11px] text-slate-500">Vous êtes à jour !</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isOpenType = notif.type === 'INCIDENT_OPEN';
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3.5 cursor-pointer transition-colors flex items-start space-x-3 ${
                  notif.isRead ? 'bg-slate-900/40 opacity-75 hover:bg-slate-800/40' : 'bg-slate-800/60 hover:bg-slate-800 border-l-2 border-indigo-500'
                }`}
              >
                <span className="text-base mt-0.5">{isOpenType ? '🔴' : '🟢'}</span>
                <div className="flex-1 space-y-0.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">{notif.title}</span>
                    {!notif.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{notif.message}</p>
                  <span className="text-[10px] text-slate-500 block pt-1 font-mono">
                    {new Date(notif.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Footer */}
      <div className="p-2.5 bg-slate-800/90 border-t border-slate-700 text-center">
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="text-xs text-indigo-400 hover:underline font-medium block"
        >
          Voir tout dans le Centre de Notifications &rarr;
        </Link>
      </div>
    </div>
  );
}
