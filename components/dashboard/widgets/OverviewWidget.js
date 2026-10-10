'use client';

import { useGlobalAnalytics } from '@/hooks/use-analytics';

export default function OverviewWidget({ size = 'large' }) {
  const { data: analytics, isLoading, error } = useGlobalAnalytics();

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[160px]">
        <div className="text-xs text-slate-400">Chargement de la vue globale...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[160px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Erreur lors du chargement des indicateurs globaux</p>
      </div>
    );
  }

  const totalApis = analytics?.totalApis ?? 0;
  const upCount = analytics?.upApisCount ?? 0;
  const downCount = analytics?.downApisCount ?? 0;
  const uptime24h = analytics?.hasData ? `${analytics.globalUptime24h ?? 100}%` : 'N/A';
  const avgLatency = analytics?.globalAvgResponseTime24h !== null && analytics?.globalAvgResponseTime24h !== undefined
    ? `${analytics.globalAvgResponseTime24h} ms`
    : 'N/A';
  const openIncidents = analytics?.openIncidentsCount ?? 0;

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📊</span> Vue Globale de l'Équipe
          </h3>
          <p className="text-xs text-slate-400">Indicateurs clés de performance et disponibilité sur 24h</p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {totalApis} Monitor{totalApis > 1 ? 's' : ''}
        </span>
      </div>

      <div className={`grid gap-4 ${size === 'small' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}`}>
        {/* Total APIs */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Total APIs</span>
          <span className="text-xl font-bold text-white">{totalApis}</span>
        </div>

        {/* APIs UP */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">APIs UP</span>
          <span className="text-xl font-bold text-emerald-400">{upCount}</span>
        </div>

        {/* APIs DOWN */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">APIs DOWN</span>
          <span className={`text-xl font-bold ${downCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {downCount}
          </span>
        </div>

        {/* Uptime 24h */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Uptime 24h</span>
          <span className="text-xl font-bold text-indigo-400">{uptime24h}</span>
        </div>

        {/* Avg Latency */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Latence Moyenne</span>
          <span className="text-xl font-bold text-cyan-400">{avgLatency}</span>
        </div>

        {/* Open Incidents */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Incidents Ouverts</span>
          <span className={`text-xl font-bold ${openIncidents > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {openIncidents}
          </span>
        </div>
      </div>
    </div>
  );
}
