'use client';

import { useLogDetail } from '@/hooks/use-logs';

export default function LogDetailModal({ checkId, onClose }) {
  const { data: check, isLoading, error } = useLogDetail(checkId);

  if (!checkId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-750 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🔍</span> Détail du Contrôle d'API
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {checkId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 animate-pulse">
              Chargement des détails du log...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
              {error.message || 'Impossible de charger ce log'}
            </div>
          ) : check ? (
            <>
              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  check.status === 'UP'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{check.status === 'UP' ? '✅' : '❌'}</span>
                  <div>
                    <span className="font-bold text-sm tracking-wide">
                      Statut: {check.status}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Exécuté le : {new Date(check.checkedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold block">
                    HTTP {check.httpStatusCode || 'N/A'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {check.responseTimeMs !== null ? `${check.responseTimeMs} ms` : 'Temps indisponible'}
                  </span>
                </div>
              </div>

              {/* Endpoint Information */}
              <div className="bg-slate-850 border border-slate-750 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Informations de l'Endpoint
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Nom</span>
                    <span className="text-white font-medium">{check.endpoint?.name || 'Inconnu'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Méthode</span>
                    <span className="inline-block font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      {check.endpoint?.method || 'GET'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">URL</span>
                    <span className="font-mono text-slate-200 break-all bg-slate-900 px-2.5 py-1 rounded border border-slate-800 block">
                      {check.endpoint?.url || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Seuil de latence</span>
                    <span className="font-mono text-slate-200">
                      {check.endpoint?.responseTimeThresholdMs ? `${check.endpoint.responseTimeThresholdMs} ms` : 'Non configuré'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Timeout configuré</span>
                    <span className="font-mono text-slate-200">{check.endpoint?.timeoutMs || 5000} ms</span>
                  </div>
                </div>
              </div>

              {/* Error Message if DOWN */}
              {check.errorMessage && (
                <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <span>⚠️</span> Message d'erreur enregistré
                  </h4>
                  <pre className="font-mono text-rose-300 text-xs bg-slate-950/60 p-3 rounded-lg border border-rose-500/20 overflow-x-auto whitespace-pre-wrap">
                    {check.errorMessage}
                  </pre>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors border border-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
