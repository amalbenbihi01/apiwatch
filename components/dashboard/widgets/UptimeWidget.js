'use client';

import { useGlobalAnalytics } from '@/hooks/use-analytics';

export default function UptimeWidget({ size = 'small' }) {
  const { data: analytics, isLoading, error } = useGlobalAnalytics();

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[200px]">
        <div className="text-xs text-slate-400">Chargement de la disponibilité...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[200px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Impossible de charger la disponibilité</p>
      </div>
    );
  }

  const uptimeVal = analytics?.hasData ? (analytics.globalUptime24h ?? 100) : 100;
  const isOptimal = uptimeVal >= 99;
  const isWarning = uptimeVal < 99 && uptimeVal >= 95;

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🛡️</span> Disponibilité & Uptime
          </h3>
          <span className="text-xs text-slate-400">24h</span>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="text-4xl font-extrabold tracking-tight">
            <span
              className={
                isOptimal
                  ? 'text-emerald-400'
                  : isWarning
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {analytics?.hasData ? `${uptimeVal}%` : '100%'}
            </span>
          </div>

          <p className="text-xs text-slate-300 font-medium">
            {isOptimal
              ? 'Disponibilité optimale'
              : isWarning
              ? 'Disponibilité dégradée'
              : 'Incidents majeurs détectés'}
          </p>

          <p className="text-[11px] text-slate-500">
            Basé sur l&apos;ensemble des contrôles exécutés sur les dernières 24 heures.
          </p>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isOptimal ? 'bg-emerald-400' : isWarning ? 'bg-amber-400' : 'bg-rose-400'
          }`}
          style={{ width: `${Math.max(5, Math.min(100, uptimeVal))}%` }}
        />
      </div>
    </div>
  );
}
