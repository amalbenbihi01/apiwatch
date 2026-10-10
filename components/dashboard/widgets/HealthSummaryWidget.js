'use client';

import { useGlobalAnalytics } from '@/hooks/use-analytics';

export default function HealthSummaryWidget({ size = 'small' }) {
  const { data: analytics, isLoading, error } = useGlobalAnalytics();

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[220px]">
        <div className="text-xs text-slate-400">Chargement de la santé du système...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[220px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Impossible de charger le résumé de santé</p>
      </div>
    );
  }

  const totalApis = analytics?.totalApis ?? 0;
  const activeApis = analytics?.activeApisCount ?? 0;
  const upApis = analytics?.upApisCount ?? 0;
  const downApis = analytics?.downApisCount ?? 0;
  const openIncidents = analytics?.openIncidentsCount ?? 0;

  const upPercentage = totalApis > 0 ? Math.round((upApis / totalApis) * 100) : 100;
  const downPercentage = totalApis > 0 ? Math.round((downApis / totalApis) * 100) : 0;

  const isHealthy = downApis === 0 && openIncidents === 0;

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🩺</span> Santé du Système
          </h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isHealthy
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
          >
            {isHealthy ? 'Opérationnel' : 'Dégradé'}
          </span>
        </div>

        <div className="space-y-4 mt-3">
          {/* Proportional health bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Répartition des monitors</span>
              <span className="font-mono text-slate-200">{upPercentage}% UP</span>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${upPercentage}%` }}
                title={`UP: ${upApis}`}
              />
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${downPercentage}%` }}
                title={`DOWN: ${downApis}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Monitors UP</span>
              <span className="text-sm font-bold text-emerald-400">{upApis}</span>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Monitors DOWN</span>
              <span className={`text-sm font-bold ${downApis > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {downApis}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Monitors actifs :</span>
        <span className="font-mono text-slate-300">{activeApis} / {totalApis}</span>
      </div>
    </div>
  );
}
