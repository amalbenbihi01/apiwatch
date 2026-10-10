'use client';

export default function HttpStatusDistributionChart({ distribution, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse h-64 flex items-center justify-center text-xs text-slate-400">
        Chargement de la répartition HTTP...
      </div>
    );
  }

  const byClass = distribution?.byClass || { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 };
  const byCode = distribution?.byCode || [];

  const total = Object.values(byClass).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl h-64 flex flex-col items-center justify-center text-center space-y-2">
        <span className="text-2xl">📊</span>
        <h4 className="text-sm font-medium text-slate-300">Aucune donnée HTTP disponible</h4>
        <p className="text-xs text-slate-500">Les statistiques s'afficheront après les premiers contrôles.</p>
      </div>
    );
  }

  const classPercentages = {
    '2xx': total > 0 ? Math.round((byClass['2xx'] / total) * 1000) / 10 : 0,
    '3xx': total > 0 ? Math.round((byClass['3xx'] / total) * 1000) / 10 : 0,
    '4xx': total > 0 ? Math.round((byClass['4xx'] / total) * 1000) / 10 : 0,
    '5xx': total > 0 ? Math.round((byClass['5xx'] / total) * 1000) / 10 : 0,
    other: total > 0 ? Math.round((byClass.other / total) * 1000) / 10 : 0,
  };

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🌐</span> Répartition des Codes HTTP
          </h3>
          <p className="text-xs text-slate-400">Ventilation par classe de statut et codes exacts</p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          {total} requête{total > 1 ? 's' : ''}
        </span>
      </div>

      {/* Stacked Progress Bar */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          {classPercentages['2xx'] > 0 && (
            <div
              style={{ width: `${classPercentages['2xx']}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`2xx (Succès): ${classPercentages['2xx']}% (${byClass['2xx']})`}
            />
          )}
          {classPercentages['3xx'] > 0 && (
            <div
              style={{ width: `${classPercentages['3xx']}%` }}
              className="bg-cyan-500 h-full transition-all duration-500"
              title={`3xx (Redirection): ${classPercentages['3xx']}% (${byClass['3xx']})`}
            />
          )}
          {classPercentages['4xx'] > 0 && (
            <div
              style={{ width: `${classPercentages['4xx']}%` }}
              className="bg-amber-500 h-full transition-all duration-500"
              title={`4xx (Erreur client): ${classPercentages['4xx']}% (${byClass['4xx']})`}
            />
          )}
          {classPercentages['5xx'] > 0 && (
            <div
              style={{ width: `${classPercentages['5xx']}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`5xx (Erreur serveur): ${classPercentages['5xx']}% (${byClass['5xx']})`}
            />
          )}
          {classPercentages.other > 0 && (
            <div
              style={{ width: `${classPercentages.other}%` }}
              className="bg-slate-600 h-full transition-all duration-500"
              title={`Autres/Timeouts: ${classPercentages.other}% (${byClass.other})`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">2xx Succès:</span>
            <span className="font-mono font-bold text-emerald-400">{byClass['2xx']} ({classPercentages['2xx']}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="text-slate-300">3xx Redir:</span>
            <span className="font-mono font-bold text-cyan-400">{byClass['3xx']} ({classPercentages['3xx']}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">4xx Client:</span>
            <span className="font-mono font-bold text-amber-400">{byClass['4xx']} ({classPercentages['4xx']}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">5xx Server:</span>
            <span className="font-mono font-bold text-rose-400">{byClass['5xx']} ({classPercentages['5xx']}%)</span>
          </div>
        </div>
      </div>

      {/* Top Exact Status Codes List */}
      {byCode.length > 0 && (
        <div className="pt-3 border-t border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Codes observés
          </span>
          <div className="flex flex-wrap gap-2">
            {byCode.map((item) => (
              <div
                key={item.code}
                className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-2 text-xs font-mono"
              >
                <span
                  className={`font-bold ${
                    item.code.startsWith('2')
                      ? 'text-emerald-400'
                      : item.code.startsWith('3')
                      ? 'text-cyan-400'
                      : item.code.startsWith('4')
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  HTTP {item.code}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {item.count} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
