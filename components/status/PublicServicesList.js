'use client';

export default function PublicServicesList({ services = [] }) {
  if (!services || services.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
        Aucun service publiquement affiché sur cette page.
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'UP':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Opérationnel</span>
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>En panne</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            <span>Dégradé</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 border border-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            <span>En attente</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <span>⚡</span> Santé des Services ({services.length})
      </h2>

      <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700 overflow-hidden shadow-lg">
        {services.map((service) => (
          <div
            key={service.id}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-700/30 transition-colors"
          >
            {/* Service Title & Method */}
            <div className="flex items-center space-x-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-slate-900 border border-slate-700 text-indigo-400">
                {service.method || 'GET'}
              </span>
              <span className="font-semibold text-slate-100 text-base">
                {service.name}
              </span>
            </div>

            {/* Metrics & Status */}
            <div className="flex items-center justify-between sm:justify-end gap-6 text-xs text-slate-400 font-mono">
              {/* Temps de réponse */}
              <div className="text-right">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-sans">
                  Temps de réponse
                </span>
                <span className="text-slate-200 font-bold">
                  {(service.responseTimeMs !== null && service.responseTimeMs !== undefined)
                    ? `${service.responseTimeMs} ms`
                    : (service.responseTime !== null && service.responseTime !== undefined)
                    ? `${service.responseTime} ms`
                    : 'N/A'}
                </span>
              </div>

              {/* Uptime 24h */}
              <div className="text-right">
                <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-sans">
                  Uptime 24h
                </span>
                <span className="text-emerald-400 font-bold">
                  {service.uptime24h !== null && service.uptime24h !== undefined
                    ? `${service.uptime24h}%`
                    : '100%'}
                </span>
              </div>

              {/* Status Badge */}
              <div className="min-w-[110px] text-right font-sans">
                {getStatusBadge(service.status)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
