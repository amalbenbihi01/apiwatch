'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ApiForm from '@/components/api-monitoring/ApiForm';
import NotificationPreferences from '@/components/api-monitoring/NotificationPreferences';
import NotificationLogsList from '@/components/api-monitoring/NotificationLogsList';
import NotificationBell from '@/components/api-monitoring/NotificationBell';
import TeamSwitcher from '@/components/team/TeamSwitcher';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardCustomizerModal from '@/components/dashboard/DashboardCustomizerModal';
import { useCreateApi } from '@/hooks/use-apis';
import { useDashboardPreferences } from '@/hooks/use-dashboard-preferences';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const { data: prefData, isLoading: isLoadingPrefs } = useDashboardPreferences();
  const createApiMutation = useCreateApi();

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

  const widgets = prefData?.preferences?.widgets || [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-lg text-white">APIWatch</span>
          <div className="hidden sm:block ml-2">
            <TeamSwitcher />
          </div>
          <span className="hidden lg:inline-flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full ml-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Monitoring (5 min)</span>
          </span>
        </div>

        {user && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <NotificationBell />
            <span className="text-sm text-slate-300 hidden md:inline">
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
              className="bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>⚙️</span>
              <span>Personnaliser</span>
            </button>

            <Link
              href="/dashboard/team"
              className="bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>👥</span>
              <span>Équipe</span>
            </Link>

            <Link
              href="/dashboard/logs"
              className="bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>📜</span>
              <span>Logs & Analytics</span>
            </Link>

            <Link
              href="/dashboard/status-page"
              className="bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-medium px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>🌐</span>
              <span>Page de statut</span>
            </Link>

            <button
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
              Configuration des alertes d'incident et historique des notifications envoyées.
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

