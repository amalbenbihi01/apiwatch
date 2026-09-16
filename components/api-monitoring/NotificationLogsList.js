'use client';

import { useNotificationLogs } from '@/hooks/use-notifications';

export default function NotificationLogsList() {
  const { data: logs, isLoading, error } = useNotificationLogs();

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl animate-pulse text-center text-xs text-slate-400">
        Chargement de l&apos;historique des notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-rose-400 text-xs text-center">
        {error.message || 'Erreur lors du chargement de l&apos;historique'}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 text-center space-y-2">
        <span className="text-xl">📫</span>
        <h4 className="text-slate-200 font-semibold text-sm">Aucune notification envoyée</h4>
        <p className="text-slate-400 text-xs">
          Les alertes et rapports d&apos;incidents apparaîtront ici après envoi.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Journal des Notifications ({logs.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Destinataire</th>
              <th className="px-4 py-3">Sujet</th>
              <th className="px-4 py-3">Créé le</th>
              <th className="px-4 py-3">Envoyé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {logs.map((log) => {
              const isSent = log.status === 'SENT';
              const isOpen = log.type === 'INCIDENT_OPEN';

              return (
                <tr key={log.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isSent
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                      title={log.error || undefined}
                    >
                      {isSent ? 'SENT' : 'FAILED'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={isOpen ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {isOpen ? '🚨 OPEN' : '✅ RESOLVED'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-200">{log.recipient}</td>

                  <td className="px-4 py-3 text-slate-300 font-sans max-w-xs truncate" title={log.subject}>
                    {log.subject}
                    {log.error && (
                      <div className="text-[10px] text-rose-400 font-mono mt-0.5 truncate">
                        Erreur : {log.error}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
