'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useInAppNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/use-in-app-notifications';

export default function NotificationCenterPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filterUnread, setFilterUnread] = useState(false);

  const { data, isLoading, error } = useInAppNotifications({
    page,
    limit: 10,
    unreadOnly: filterUnread,
  });

  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();

  const notifications = data?.notifications || [];
  const totalPages = data?.totalPages || 1;

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.endpointId) {
      router.push(`/dashboard/apis/${notif.endpointId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-6">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center space-x-1"
          >
            <span>&larr; Retour au Dashboard</span>
          </Link>
        </div>

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-6 rounded-xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>🔔 Centre de Notifications In-App</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Historique complet de vos alertes d&apos;incidents et rétablissements.
            </p>
          </div>

          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors self-start sm:self-auto"
          >
            Tout marquer comme lu
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700 text-xs font-medium w-fit">
          <button
            onClick={() => {
              setFilterUnread(false);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              !filterUnread ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Toutes les notifications
          </button>
          <button
            onClick={() => {
              setFilterUnread(true);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              filterUnread ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Non lues uniquement
          </button>
        </div>

        {/* List */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Chargement des notifications...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-rose-400">
              {error.message || 'Erreur lors du chargement des notifications'}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <span className="text-2xl">📭</span>
              <h3 className="text-sm font-semibold text-slate-200">Aucune notification</h3>
              <p className="text-xs text-slate-400">
                {filterUnread
                  ? 'Vous n&apos;avez aucune notification non lue.'
                  : 'Aucune alerte n&apos;a encore été enregistrée.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/60">
              {notifications.map((notif) => {
                const isOpenType = notif.type === 'INCIDENT_OPEN';
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-5 cursor-pointer transition-colors flex items-start space-x-4 ${
                      notif.isRead
                        ? 'bg-slate-900/40 opacity-75 hover:bg-slate-800/40'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-l-4 border-indigo-500'
                    }`}
                  >
                    <span className="text-xl mt-0.5">{isOpenType ? '🔴' : '🟢'}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-200">{notif.title}</h4>
                        <span className="text-xs font-mono text-slate-400">
                          {new Date(notif.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{notif.message}</p>

                      {notif.endpoint && (
                        <div className="pt-2 flex items-center space-x-2 text-xs font-mono text-indigo-400">
                          <span>API : {notif.endpoint.name} ({notif.endpoint.url})</span>
                          <span>&rarr;</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &larr; Précédent
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Page {page} sur {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
