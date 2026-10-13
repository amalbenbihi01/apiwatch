'use client';

import { useGlobalResponseTimeSeries } from '@/hooks/use-analytics';
import AnalyticsChart from '@/components/api-monitoring/AnalyticsChart';

export default function ResponseTimeWidget({ size = 'large' }) {
  const { data, isLoading, error } = useGlobalResponseTimeSeries('24h');

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[300px]">
        <div className="text-xs text-slate-400">Chargement de la courbe de latence...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[300px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Impossible de charger le graphique de temps de réponse</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📈</span> Temps de Réponse Global
          </h3>
          <p className="text-xs text-slate-400">Évolution de la latence moyenne de l&apos;équipe par créneau (24h)</p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          En direct
        </span>
      </div>

      <AnalyticsChart series={data?.chartSeries || []} isLoading={false} />
    </div>
  );
}
