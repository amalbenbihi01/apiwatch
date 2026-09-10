'use client';

export default function HealthCheckStatus({
  latestCheck,
  isLoadingCheck,
  onRunCheck,
  isChecking,
}) {
  const isUp = latestCheck?.status === 'UP';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Health Check</h2>
          <p className="text-xs text-slate-400">
            Contrôle en temps réel de la santé de cet endpoint
          </p>
        </div>

        <button
          onClick={onRunCheck}
          disabled={isChecking || isLoadingCheck}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>{isChecking ? 'Vérification en cours...' : latestCheck ? 'Réessayer' : 'Vérifier maintenant'}</span>
        </button>
      </div>

      {isLoadingCheck ? (
        <div className="p-6 bg-slate-900/40 rounded-lg border border-slate-700/50 animate-pulse text-center text-xs text-slate-400">
          Chargement du dernier contrôle...
        </div>
      ) : !latestCheck ? (
        <div className="p-6 bg-slate-900/40 rounded-lg border border-slate-700/50 text-center space-y-2">
          <p className="text-sm text-slate-300">Aucun contrôle effectué pour le moment.</p>
          <p className="text-xs text-slate-400">
            Cliquez sur le bouton ci-dessus pour effectuer votre premier Health Check.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              className={`p-4 rounded-lg border ${
                isUp
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider block mb-1 text-slate-400">
                Statut actuel
              </span>
              <span className={`text-base font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '🟢 UP' : '🔴 DOWN'}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                HTTP Status
              </span>
              <span className="text-base font-bold font-mono text-slate-200">
                {latestCheck.httpStatusCode ? latestCheck.httpStatusCode : '—'}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Temps de réponse
              </span>
              <span className="text-base font-bold font-mono text-slate-200">
                {latestCheck.responseTimeMs !== null && latestCheck.responseTimeMs !== undefined
                  ? `${latestCheck.responseTimeMs} ms`
                  : '—'}
              </span>
            </div>
          </div>

          {!isUp && latestCheck.errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
              <span className="font-semibold">Erreur détectée : </span>
              {latestCheck.errorMessage}
            </div>
          )}

          <div className="text-xs text-slate-400 pt-2 border-t border-slate-700/60 flex items-center justify-between">
            <span>Dernière vérification :</span>
            <span className="text-slate-300 font-mono">
              {new Date(latestCheck.checkedAt).toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
