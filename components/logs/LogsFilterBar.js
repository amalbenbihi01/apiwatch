'use client';

export default function LogsFilterBar({
  endpoints = [],
  filters,
  onFilterChange,
  onResetFilters,
  onExportCsv,
  isExporting,
}) {
  return (
    <div className="bg-slate-850 border border-slate-750 p-4 rounded-2xl shadow-xl space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Recherche textuelle
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Nom API, URL, message d'erreur..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Endpoint Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Endpoint API
          </label>
          <select
            value={filters.endpointId || 'all'}
            onChange={(e) => onFilterChange('endpointId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">Tous les endpoints</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name} ({ep.method})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Statut
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">Tous (UP / DOWN)</option>
            <option value="UP">UP uniquement</option>
            <option value="DOWN">DOWN uniquement</option>
          </select>
        </div>

        {/* HTTP Code Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Code HTTP
          </label>
          <select
            value={filters.httpCode || 'all'}
            onChange={(e) => onFilterChange('httpCode', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">Tous les codes</option>
            <option value="2xx">2xx (Succès)</option>
            <option value="3xx">3xx (Redirection)</option>
            <option value="4xx">4xx (Client Error)</option>
            <option value="5xx">5xx (Server Error)</option>
            <option value="200">200 OK</option>
            <option value="400">400 Bad Request</option>
            <option value="401">401 Unauthorized</option>
            <option value="403">403 Forbidden</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Internal Error</option>
            <option value="502">502 Bad Gateway</option>
            <option value="503">503 Service Unavailable</option>
            <option value="504">504 Gateway Timeout</option>
          </select>
        </div>

        {/* Period Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Période
          </label>
          <select
            value={filters.period || '24h'}
            onChange={(e) => onFilterChange('period', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="24h">Dernières 24 heures</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="all">Historique complet</option>
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
        >
          Réinitialiser les filtres
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <span>📥</span>
          {isExporting ? 'Export en cours...' : 'Exporter CSV'}
        </button>
      </div>
    </div>
  );
}
