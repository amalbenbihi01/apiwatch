'use client';

import Link from 'next/link';

export default function IncidentsList({ incidents, isLoading, error, showEndpoint = true }) {
  if (isLoading) {
    return (
      <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-xl animate-pulse text-center text-xs text-slate-400">
        Chargement des incidents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm text-center">
        {error.message || 'Erreur lors du chargement des incidents'}
      </div>
    );
  }

  if (!incidents || incidents.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-8 text-center space-y-2">
        <span className="text-xl">🟢</span>
        <h4 className="text-slate-200 font-semibold text-sm">Aucun incident détecté</h4>
        <p className="text-slate-400 text-xs">
          Toutes vos APIs surveillées fonctionnent normalement.
        </p>
      </div>
    );
  }

  const formatDuration = (startedAt, resolvedAt) => {
    const start = new Date(startedAt).getTime();
    const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
    const diffMs = Math.max(0, end - start);
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes} min`;
    }
    return '< 1 min';
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono text-slate-300">
          <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Statut</th>
              {showEndpoint && <th className="px-4 py-3">API Concernée</th>}
              <th className="px-4 py-3">Cause / Titre</th>
              <th className="px-4 py-3">Début</th>
              <th className="px-4 py-3">Fin / Résolution</th>
              <th className="px-4 py-3">Durée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {incidents.map((inc) => {
              const isOpen = inc.status === 'OPEN';
              return (
                <tr key={inc.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center space-x-1 font-bold ${
                        isOpen ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      <span className={isOpen ? 'animate-ping' : ''}>
                        {isOpen ? '🔴' : '🟢'}
                      </span>
                      <span>{isOpen ? 'OPEN' : 'RESOLVED'}</span>
                    </span>
                  </td>

                  {showEndpoint && (
                    <td className="px-4 py-3 font-sans font-medium text-white">
                      {inc.endpoint ? (
                        <Link
                          href={`/dashboard/apis/${inc.endpoint.id}`}
                          className="hover:underline text-indigo-400"
                        >
                          {inc.endpoint.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 text-slate-300">
                    <div className="font-semibold text-slate-200">{inc.title || 'Incident'}</div>
                    {inc.cause && <div className="text-[11px] text-slate-400 mt-0.5">{inc.cause}</div>}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {new Date(inc.startedAt).toLocaleString('fr-FR')}
                  </td>

                  <td className="px-4 py-3 text-slate-400">
                    {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString('fr-FR') : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        isOpen
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}
                    >
                      {isOpen ? `En cours (${formatDuration(inc.startedAt, null)})` : formatDuration(inc.startedAt, inc.resolvedAt)}
                    </span>
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
