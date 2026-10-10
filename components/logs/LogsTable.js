'use client';

export default function LogsTable({
  checks = [],
  pagination = {},
  isLoading = false,
  onPageChange,
  onLimitChange,
  onSelectCheck,
}) {
  const { page = 1, limit = 20, totalCount = 0, totalPages = 1 } = pagination;

  return (
    <div className="bg-slate-850 border border-slate-750 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Table Header / Summary */}
      <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📜</span> Journaux de Contrôle (Logs)
          </h3>
          <p className="text-xs text-slate-400">
            {totalCount} entrée{totalCount > 1 ? 's' : ''} trouvée{totalCount > 1 ? 's' : ''}
          </p>
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Lignes par page :</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Endpoint</th>
              <th className="py-3 px-4">Méthode</th>
              <th className="py-3 px-4">Code HTTP</th>
              <th className="py-3 px-4">Latence</th>
              <th className="py-3 px-4">Message / Erreur</th>
              <th className="py-3 px-4">Date & Heure</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 animate-pulse">
                  Chargement des logs...
                </td>
              </tr>
            ) : checks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                  Aucun log ne correspond aux critères de recherche.
                </td>
              </tr>
            ) : (
              checks.map((c) => {
                const isUp = c.status === 'UP';
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCheck(c.id)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    {/* Status badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isUp
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {c.status}
                      </span>
                    </td>

                    {/* Endpoint Name */}
                    <td className="py-3 px-4 font-sans font-medium text-white max-w-[180px] truncate">
                      {c.endpointName}
                    </td>

                    {/* Method */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                        {c.endpointMethod}
                      </span>
                    </td>

                    {/* HTTP Code */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          c.httpStatusCode >= 200 && c.httpStatusCode < 300
                            ? 'text-emerald-400'
                            : c.httpStatusCode >= 300 && c.httpStatusCode < 400
                            ? 'text-cyan-400'
                            : c.httpStatusCode >= 400 && c.httpStatusCode < 500
                            ? 'text-amber-400'
                            : c.httpStatusCode >= 500
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {c.httpStatusCode || '—'}
                      </span>
                    </td>

                    {/* Response Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.responseTimeMs !== null && c.responseTimeMs !== undefined ? (
                        <span className="text-cyan-400">{c.responseTimeMs} ms</span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>

                    {/* Error preview */}
                    <td className="py-3 px-4 max-w-[240px] truncate text-slate-400 font-sans">
                      {c.errorMessage ? (
                        <span className="text-rose-400" title={c.errorMessage}>
                          {c.errorMessage}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* CheckedAt */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {c.checkedAt ? new Date(c.checkedAt).toLocaleString() : '—'}
                    </td>

                    {/* Action button */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectCheck(c.id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Page <span className="font-bold text-white">{page}</span> sur{' '}
          <span className="font-bold text-white">{totalPages || 1}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors border border-slate-700"
          >
            ← Précédent
          </button>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors border border-slate-700"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  );
}
