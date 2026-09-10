'use client';

import ApiCard from './ApiCard';

export default function ApiList({ apis, isLoading, error, onDelete }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 h-36 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm text-center">
        {error.message || 'Une erreur est survenue lors de la récupération des APIs'}
      </div>
    );
  }

  if (!apis || apis.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-12 text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto text-slate-400 font-bold text-xl">
          📡
        </div>
        <h3 className="text-slate-200 font-semibold text-lg">Aucune API configurée</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Vous n&apos;avez pas encore enregistré d&apos;endpoint d&apos;API à surveiller. Cliquez sur le bouton d&apos;ajout pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {apis.map((api) => (
        <ApiCard key={api.id} api={api} onDelete={onDelete} />
      ))}
    </div>
  );
}
