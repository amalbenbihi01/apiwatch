'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ApiList from '@/components/api-monitoring/ApiList';
import ApiForm from '@/components/api-monitoring/ApiForm';
import IncidentsList from '@/components/api-monitoring/IncidentsList';
import { useApis, useCreateApi, useDeleteApi } from '@/hooks/use-apis';
import { useIncidents } from '@/hooks/use-incidents';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: apis, isLoading, error } = useApis();
  const { data: openIncidents } = useIncidents('OPEN');
  const { data: allIncidents, isLoading: isLoadingIncidents, error: errorIncidents } = useIncidents();

  const createApiMutation = useCreateApi();
  const deleteApiMutation = useDeleteApi();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        router.push('/login');
      }
    }

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCreateApi = (formData) => {
    createApiMutation.mutate(formData, {
      onSuccess: () => {
        setShowAddForm(false);
      },
    });
  };

  const handleDeleteApi = (id) => {
    deleteApiMutation.mutate(id);
  };

  const openCount = openIncidents?.length || 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-lg text-white">APIWatch</span>
          <span className="hidden md:inline-flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full ml-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Monitoring automatique (5 min)</span>
          </span>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-300 hidden sm:inline">
              {user.name} <span className="text-slate-500">({user.email})</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-600"
            >
              Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-8">
        {/* Top Control & Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-slate-800/80 border border-slate-700/80 p-5 rounded-xl flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Mes APIs</h1>
              <p className="text-xs text-slate-400">
                Gérez la liste de vos endpoints d&apos;APIs enregistrés.
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center space-x-2"
            >
              <span>{showAddForm ? 'Fermer le formulaire' : '+ Ajouter une API'}</span>
            </button>
          </div>

          <div
            className={`p-5 rounded-xl border flex items-center justify-between ${
              openCount > 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block">
                Incidents en cours
              </span>
              <span className="text-2xl font-extrabold mt-1 block">
                {openCount > 0 ? `🔴 ${openCount} Open` : '🟢 0 Incident'}
              </span>
            </div>
            <div className="text-2xl">{openCount > 0 ? '⚠️' : '✅'}</div>
          </div>
        </div>

        {/* Add Form Section */}
        {showAddForm && (
          <div className="transition-all">
            <ApiForm
              onSubmit={handleCreateApi}
              onCancel={() => setShowAddForm(false)}
              isLoading={createApiMutation.isPending}
            />
            {createApiMutation.isError && (
              <p className="text-xs text-rose-400 mt-2 px-2">
                Erreur: {createApiMutation.error.message}
              </p>
            )}
          </div>
        )}

        {/* API List Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">
            Endpoints sous surveillance ({apis?.length || 0})
          </h2>
          <ApiList
            apis={apis}
            isLoading={isLoading}
            error={error}
            onDelete={handleDeleteApi}
          />
        </section>

        {/* Incidents Section */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">
              Incidents récents
            </h2>
          </div>
          <IncidentsList
            incidents={allIncidents}
            isLoading={isLoadingIncidents}
            error={errorIncidents}
            showEndpoint={true}
          />
        </section>
      </main>
    </div>
  );
}
