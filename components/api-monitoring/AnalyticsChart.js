'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsChart({ series, isLoading }) {
  if (isLoading) {
    return (
      <div className="h-64 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center justify-center animate-pulse text-xs text-slate-400">
        Chargement des métriques graphiques...
      </div>
    );
  }

  const hasData = series && series.some((s) => s.hasData);

  if (!hasData) {
    return (
      <div className="h-64 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center space-y-2 p-6 text-center">
        <span className="text-2xl">📊</span>
        <h4 className="text-sm font-medium text-slate-300">Aucune donnée graphique disponible</h4>
        <p className="text-xs text-slate-400">
          Aucun contrôle n&apos;a été effectué durant cette période.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1 font-mono">
          <div className="font-bold text-slate-200">{data.label}</div>
          {data.hasData ? (
            <>
              <div className="text-indigo-400">
                Temps moyen : <span className="font-bold">{data.avgResponseTimeMs !== null ? `${data.avgResponseTimeMs} ms` : '—'}</span>
              </div>
              <div className="text-emerald-400">
                Disponibilité : <span className="font-bold">{data.uptimePercentage !== null ? `${data.uptimePercentage}%` : '—'}</span>
              </div>
              <div className="text-slate-400 text-[10px]">
                Checks: {data.totalChecks} ({data.upChecks} UP / {data.downChecks} DOWN)
              </div>
            </>
          ) : (
            <div className="text-slate-500 italic">Aucune donnée sur ce créneau</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Évolution du Temps de Réponse (ms)
          </h3>
          <p className="text-xs text-slate-400">
            Performance moyenne enregistrée par tranche temporelle
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAvgTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              unit="ms"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="avgResponseTimeMs"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAvgTime)"
              connectNulls={false} // Cleanly handles missing buckets without fake lines
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
