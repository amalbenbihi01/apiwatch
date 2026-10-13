'use client';

import { useGlobalActivity } from '@/hooks/use-analytics';

export default function ActivityWidget({ size = 'small' }) {
  const { data: activities, isLoading, error } = useGlobalActivity(10);

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[220px]">
        <div className="text-xs text-slate-400">Chargement du flux d&apos;activité...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[220px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Impossible de charger l&apos;activité récente</p>
      </div>
    );
  }

  const activityList = activities || [];

  const getEventBadge = (type, status) => {
    switch (type) {
      case 'INCIDENT_OPEN':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">Incident</span>;
      case 'INCIDENT_RESOLVED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Résolu</span>;
      case 'ENDPOINT_CREATED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">Ajout</span>;
      case 'HEALTH_CHECK_UP':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-bold">UP</span>;
      case 'HEALTH_CHECK_DOWN':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 border border-slate-700 font-bold">DOWN</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">Event</span>;
    }
  };

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>⏱️</span> Activité Récente
        </h3>
        <span className="text-xs text-slate-400 font-mono">10 récents</span>
      </div>

      {activityList.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-xs text-slate-400">Aucune activité enregistrée pour le moment.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
          {activityList.map((item) => (
            <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  {getEventBadge(item.type, item.status)}
                  <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
              </div>

              <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
