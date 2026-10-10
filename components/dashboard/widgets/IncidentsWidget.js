'use client';

import { useIncidents } from '@/hooks/use-incidents';
import Link from 'next/link';

export default function IncidentsWidget({ size = 'medium' }) {
  const { data: incidents, isLoading, error } = useIncidents();

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[220px]">
        <div className="text-xs text-slate-400">Chargement des incidents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[220px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Impossible de charger les incidents</p>
      </div>
    );
  }

  const incidentList = incidents || [];
  const openIncidents = incidentList.filter((i) => i.status === 'OPEN');
  const resolvedIncidents = incidentList.filter((i) => i.status === 'RESOLVED');

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🚨</span> Journal des Incidents
            </h3>
            {openIncidents.length > 0 && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {openIncidents.length} actif{openIncidents.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {incidentList.length} total
          </span>
        </div>

        {incidentList.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <span className="text-2xl">🎉</span>
            <p className="text-xs text-emerald-400 font-medium">Aucun incident détecté pour cette équipe.</p>
            <p className="text-[11px] text-slate-500">Tous les monitors répondent conformément aux seuils.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto mt-2">
            {incidentList.slice(0, 5).map((inc) => {
              const isOpen = inc.status === 'OPEN';
              return (
                <div key={inc.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          isOpen
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isOpen ? 'En cours' : 'Résolu'}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">
                        {inc.endpoint?.name || 'Endpoint'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {inc.cause || 'Échec de contrôle'}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                    {new Date(inc.startedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800 text-right">
        <Link
          href="/dashboard"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
        >
          Voir tous les incidents →
        </Link>
      </div>
    </div>
  );
}
