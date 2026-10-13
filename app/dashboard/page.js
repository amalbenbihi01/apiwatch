'use client';

import { useState } from 'react';
import AppHeader from '@/components/AppHeader';
import ApiForm from '@/components/api-monitoring/ApiForm';
import NotificationPreferences from '@/components/api-monitoring/NotificationPreferences';
import NotificationLogsList from '@/components/api-monitoring/NotificationLogsList';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardCustomizerModal from '@/components/dashboard/DashboardCustomizerModal';
import { useCreateApi } from '@/hooks/use-apis';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';

export default function DashboardPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const { data: prefData, isLoading: isLoadingPrefs } = useDashboardPreferences();
  const createApiMutation = useCreateApi();

  const handleCreateApi = (formData) => {
    createApiMutation.mutate(formData, {
      onSuccess: () => {
        setShowAddForm(false);
      },
    });
  };

  const widgets = prefData?.preferences?.widgets || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header unifié partagé */}
      <AppHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Tableau de Bord Personnalisable</h1>
              {prefData?.isCustom && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Vue personnalisée
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Supervision de la disponibilité, des incidents et des performances en temps réel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCustomizer(true)}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Personnaliser</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
            >
              <span>{showAddForm ? '✕ Fermer' : '+ Ajouter une API'}</span>
            </button>
          </div>
        </div>

        {/* Section Création / Édition Formulaire */}
        {showAddForm && (
          <section className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl transition-all animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-white mb-4">Ajouter un monitor d&apos;API</h2>
            <ApiForm
              onSubmit={handleCreateApi}
              isLoading={createApiMutation.isPending}
              onCancel={() => setShowAddForm(false)}
            />
          </section>
        )}

        {/* Customizable Dashboard Grid */}
        {isLoadingPrefs ? (
          <div className="min-h-[300px] flex items-center justify-center bg-slate-850/40 border border-slate-800 rounded-2xl animate-pulse">
            <div className="text-xs text-slate-400">Chargement de la disposition du tableau de bord...</div>
          </div>
        ) : (
          <DashboardGrid widgets={widgets} />
        )}

        {/* Section Paramètres de Notification & Journal d'envoi */}
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">Alertes & Notifications</h2>
            <p className="text-xs text-slate-400 mt-1">
              Configuration des alertes d&apos;incident et historique des notifications envoyées.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <NotificationPreferences />
            </div>
            <div className="lg:col-span-2">
              <NotificationLogsList />
            </div>
          </div>
        </section>
      </main>

      {/* Modal de Personnalisation */}
      <DashboardCustomizerModal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        initialWidgets={widgets}
      />
    </div>
  );
}
