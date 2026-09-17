'use client';

import { usePublicStatusPage } from '@/hooks/use-status-page';
import PublicStatusHeader from '@/components/status/PublicStatusHeader';
import PublicServicesList from '@/components/status/PublicServicesList';
import PublicIncidentsList from '@/components/status/PublicIncidentsList';
import Link from 'next/link';

export default function PublicStatusClient({ slug }) {
  const { data, isLoading, isError, error, dataUpdatedAt } = usePublicStatusPage(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Chargement de la page de statut...
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl space-y-5">
          <div className="h-16 w-16 bg-slate-700/60 rounded-full flex items-center justify-center mx-auto text-3xl text-slate-400">
            🔍
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">404 - Page Introuvable</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              La page de statut pour <span className="font-mono text-emerald-400">/status/{slug}</span> n&apos;existe pas ou a été désactivée par son propriétaire.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <span>Retour à l&apos;accueil</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header line */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-bold text-slate-200 text-sm tracking-wide">
              APIWatch Status
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Mise à jour en direct (30s)
          </span>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-10">
        <PublicStatusHeader
          title={data.title}
          description={data.description}
          globalStatus={data.globalStatus}
          updatedAt={dataUpdatedAt}
        />

        <PublicServicesList services={data.services} />

        <PublicIncidentsList incidents={data.incidents} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 space-y-1">
        <p>Alimenté par <span className="text-slate-400 font-semibold">APIWatch Monitoring</span> Platform</p>
        <p>© {new Date().getFullYear()} Tous droits réservés.</p>
      </footer>
    </div>
  );
}
