'use client';

export default function PublicIncidentsList({ incidents = [] }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <span>🚨</span> Historique des Incidents Récents
      </h2>

      {incidents.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-400 space-y-2">
          <div className="text-2xl">✨</div>
          <p className="font-medium text-slate-300">Aucun incident récent à signaler.</p>
          <p className="text-xs text-slate-500">Tous nos services fonctionnent de manière stable.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => {
            const isOpen = incident.status === 'OPEN';
            return (
              <div
                key={incident.id}
                className={`p-5 rounded-xl border transition-all ${
                  isOpen
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : 'bg-slate-800/80 border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isOpen
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isOpen ? '🔴 Incident En Cours' : '🟢 Résolu'}
                    </span>
                    <h3 className="font-bold text-white text-base">
                      {incident.title}
                    </h3>
                  </div>

                  {incident.serviceName && (
                    <span className="text-xs font-mono bg-slate-900 px-3 py-1 rounded-md text-indigo-300 border border-slate-700 self-start sm:self-auto">
                      Service : {incident.serviceName}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Débuté le
                    </span>
                    <span className="text-slate-300 font-mono">
                      {formatDate(incident.startedAt)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Résolu le
                    </span>
                    <span className="text-slate-300 font-mono">
                      {incident.resolvedAt ? formatDate(incident.resolvedAt) : 'En cours...'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                      Durée d&apos;interruption
                    </span>
                    <span className="text-slate-300 font-mono">
                      {incident.durationMinutes !== null && incident.durationMinutes !== undefined
                        ? `${incident.durationMinutes} min`
                        : isOpen
                        ? 'En cours'
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {incident.cause && (
                  <div className="mt-3 pt-3 border-t border-slate-700/40 text-xs text-slate-300 bg-slate-900/40 p-3 rounded-lg">
                    <span className="font-semibold text-slate-400 block mb-1">Détails / Cause :</span>
                    <p className="text-slate-400 font-mono text-[11px] leading-relaxed">
                      {incident.cause}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
