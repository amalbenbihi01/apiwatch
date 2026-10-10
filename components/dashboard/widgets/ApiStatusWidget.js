'use client';

import Link from 'next/link';
import { useApis } from '@/hooks/use-apis';

export default function ApiStatusWidget({ size = 'medium' }) {
  const { data: apis, isLoading, error } = useApis();

  if (isLoading) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl animate-pulse flex items-center justify-center min-h-[220px]">
        <div className="text-xs text-slate-400">Chargement des statuts des APIs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl min-h-[220px] flex items-center justify-center">
        <p className="text-xs text-rose-400">Impossible de charger les statuts d'API</p>
      </div>
    );
  }

  const endpointList = apis || [];

  return (
    <div className="bg-slate-850 border border-slate-750 p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>⚡</span> Statut des APIs
            </h3>
            <p className="text-xs text-slate-400">État instantané des monitors de l'équipe</p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {endpointList.length} configuré{endpointList.length > 1 ? 's' : ''}
          </span>
        </div>

        {endpointList.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-400">Aucun monitor d'API configuré dans cette équipe.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto mt-2">
            {endpointList.map((api) => (
              <div key={api.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      api.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                    }`}
                  />
                  <div className="truncate">
                    <Link
                      href={`/dashboard/apis/${api.id}`}
                      className="font-semibold text-slate-200 hover:text-indigo-400 transition-colors truncate block"
                    >
                      {api.name}
                    </Link>
                    <span className="text-[11px] text-slate-500 font-mono truncate block">
                      {api.method} {api.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {api.timeoutMs}ms
                  </span>
                  <Link
                    href={`/dashboard/apis/${api.id}`}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800 text-right">
        <Link
          href="/dashboard"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
        >
          Gérer les monitors →
        </Link>
      </div>
    </div>
  );
}
