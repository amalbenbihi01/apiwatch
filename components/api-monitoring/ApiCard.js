'use client';

import Link from 'next/link';

export default function ApiCard({ api, onDelete }) {
  const methodColors = {
    GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    DELETE: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  const handleDelete = () => {
    if (window.confirm(`Voulez-vous vraiment supprimer l'API "${api.name}" ?`)) {
      onDelete(api.id);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-600 transition-colors">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-white text-base truncate" title={api.name}>
            {api.name}
          </h3>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              methodColors[api.method] || 'bg-slate-700 text-slate-300'
            }`}
          >
            {api.method}
          </span>
        </div>

        <p className="font-mono text-xs text-slate-400 truncate" title={api.url}>
          {api.url}
        </p>

        {api.description && (
          <p className="text-xs text-slate-400 line-clamp-2 pt-1">{api.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-700/60 pt-3 text-xs">
        <div className="flex items-center space-x-1.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              api.isActive ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          ></span>
          <span className="text-slate-300 font-medium">
            {api.isActive ? '🟢 Active' : '🔴 Inactive'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href={`/dashboard/apis/${api.id}`}
            className="text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-700 transition-colors"
          >
            Détails / Éditer
          </Link>
          <button
            onClick={handleDelete}
            className="text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
