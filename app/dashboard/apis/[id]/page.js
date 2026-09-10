'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ApiForm from '@/components/api-monitoring/ApiForm';
import HealthCheckStatus from '@/components/api-monitoring/HealthCheckStatus';
import IncidentsList from '@/components/api-monitoring/IncidentsList';
import { useApi, useUpdateApi, useDeleteApi } from '@/hooks/use-apis';
import { useLatestCheck, useApiChecks, useRunCheck } from '@/hooks/use-monitoring';
import { useEndpointIncidents } from '@/hooks/use-incidents';

export default function ApiDetailPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const { data: api, isLoading, error } = useApi(id);
  const updateApiMutation = useUpdateApi();
  const deleteApiMutation = useDeleteApi();

  const { data: latestCheck, isLoading: isLoadingLatestCheck } = useLatestCheck(id);
  const { data: checksHistory } = useApiChecks(id);
  const { data: endpointIncidents, isLoading: isLoadingIncidents, error: errorIncidents } = useEndpointIncidents(id);
  const runCheckMutation = useRunCheck();

  const handleUpdate = (formData) => {
    updateApiMutation.mutate(
      { id, ...formData },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (window.confirm(`Voulez-vous supprimer définitivement l'API "${api?.name}" ?`)) {
      deleteApiMutation.mutate(id, {
        onSuccess: () => {
          router.push('/dashboard');
        },
      });
    }
  };

  const handleRunCheck = () => {
    runCheckMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-sm text-slate-400">Chargement des détails de l&apos;API...</div>
      </div>
    );
  }

  if (error || !api) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
          {error?.message || 'API introuvable ou accès non autorisé'}
        </div>
        <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
          &larr; Retourner au Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-6">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center space-x-1"
          >
            <span>&larr; Retour à la liste des APIs</span>
          </Link>
        </div>

        {/* Edit Form or Detail Display */}
        {isEditing ? (
          <ApiForm
            initialData={api}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isLoading={updateApiMutation.isPending}
          />
        ) : (
          <>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-5">
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-white">{api.name}</h1>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-slate-700 text-slate-200">
                      {api.method}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-400 mt-1">{api.url}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs px-3.5 py-2 rounded-lg font-medium border border-rose-500/20 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Surveillance future
                  </span>
                  <span className="text-sm font-medium text-slate-200">
                    {api.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Méthode HTTP
                  </span>
                  <span className="text-sm font-medium text-slate-200 font-mono">
                    {api.method}
                  </span>
                </div>
              </div>

              {api.description && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Description
                  </h3>
                  <p className="text-sm text-slate-300 bg-slate-900/40 p-4 rounded-lg border border-slate-700/50">
                    {api.description}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-700/80 pt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <span>Créée le : </span>
                  <span className="text-slate-300 font-mono">
                    {new Date(api.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div>
                  <span>Dernière modification : </span>
                  <span className="text-slate-300 font-mono">
                    {new Date(api.updatedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Health Check Section */}
            <HealthCheckStatus
              latestCheck={latestCheck}
              isLoadingCheck={isLoadingLatestCheck}
              onRunCheck={handleRunCheck}
              isChecking={runCheckMutation.isPending}
            />

            {/* Incidents History Section for this API */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Historique des Incidents de cette API ({endpointIncidents?.length || 0})
              </h3>
              <IncidentsList
                incidents={endpointIncidents}
                isLoading={isLoadingIncidents}
                error={errorIncidents}
                showEndpoint={false}
              />
            </section>

            {/* Checks History Section */}
            {checksHistory && checksHistory.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Historique des contrôles ({checksHistory.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono text-slate-300">
                    <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                      <tr>
                        <th className="px-4 py-2">Statut</th>
                        <th className="px-4 py-2">Code HTTP</th>
                        <th className="px-4 py-2">Temps de réponse</th>
                        <th className="px-4 py-2">Date & Heure</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {checksHistory.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/30">
                          <td className="px-4 py-2">
                            <span className={c.status === 'UP' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {c.status === 'UP' ? '🟢 UP' : '🔴 DOWN'}
                            </span>
                          </td>
                          <td className="px-4 py-2">{c.httpStatusCode || '—'}</td>
                          <td className="px-4 py-2">{c.responseTimeMs !== null ? `${c.responseTimeMs} ms` : '—'}</td>
                          <td className="px-4 py-2 text-slate-400">
                            {new Date(c.checkedAt).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
