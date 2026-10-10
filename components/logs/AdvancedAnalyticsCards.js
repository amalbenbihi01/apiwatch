'use client';

export default function AdvancedAnalyticsCards({ analytics, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-850 border border-slate-750 rounded-xl p-3" />
        ))}
      </div>
    );
  }

  const hasData = analytics?.hasData;

  const uptime = hasData && analytics?.uptimePercentage !== null
    ? `${analytics.uptimePercentage}%`
    : 'N/A';

  const avgLatency = hasData && analytics?.avgResponseTimeMs !== null
    ? `${analytics.avgResponseTimeMs} ms`
    : 'N/A';

  const minLatency = hasData && analytics?.minResponseTimeMs !== null
    ? `${analytics.minResponseTimeMs} ms`
    : 'N/A';

  const maxLatency = hasData && analytics?.maxResponseTimeMs !== null
    ? `${analytics.maxResponseTimeMs} ms`
    : 'N/A';

  const medianLatency = hasData && analytics?.medianResponseTimeMs !== null
    ? `${analytics.medianResponseTimeMs} ms`
    : 'N/A';

  const p95Latency = hasData && analytics?.p95ResponseTimeMs !== null
    ? `${analytics.p95ResponseTimeMs} ms`
    : 'N/A';

  const mttr = analytics?.mttrFormatted || 'N/A';
  const totalChecks = analytics?.totalChecks ?? 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Disponibilité */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Disponibilité
          </span>
          <span className="text-lg font-bold text-indigo-400 mt-1 block">
            {uptime}
          </span>
        </div>

        {/* Latence Moyenne */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Latence Moyenne
          </span>
          <span className="text-lg font-bold text-cyan-400 mt-1 block">
            {avgLatency}
          </span>
        </div>

        {/* Latence Min */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Latence Min
          </span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">
            {minLatency}
          </span>
        </div>

        {/* Latence Max */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Latence Max
          </span>
          <span className="text-lg font-bold text-rose-400 mt-1 block">
            {maxLatency}
          </span>
        </div>

        {/* Médiane */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Médiane (P50)
          </span>
          <span className="text-lg font-bold text-teal-400 mt-1 block">
            {medianLatency}
          </span>
        </div>

        {/* P95 */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Percentile P95
          </span>
          <span className="text-lg font-bold text-purple-400 mt-1 block">
            {p95Latency}
          </span>
        </div>

        {/* MTTR */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            MTTR (Résolution)
          </span>
          <span className="text-lg font-bold text-amber-400 mt-1 block">
            {mttr}
          </span>
        </div>

        {/* Total Checks */}
        <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl">
          <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">
            Total Contrôles
          </span>
          <span className="text-lg font-bold text-white mt-1 block">
            {totalChecks}
          </span>
        </div>
      </div>
    </div>
  );
}
