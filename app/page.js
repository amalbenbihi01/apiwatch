import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
          <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              APIWatch
            </h1>
            <p className="text-xs text-slate-400">
              Surveillance d&apos;APIs &amp; Gestion d&apos;Incidents
            </p>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">
          Plateforme complète de monitoring en temps réel, alertes d&apos;incidents, métriques avancées et gestion d&apos;équipes.
        </p>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <Link
            href="/login"
            className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-500/20"
          >
            Se connecter
          </Link>
          <Link
            href="/register"
            className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium px-4 py-2.5 rounded-lg text-sm border border-slate-600 transition-colors"
          >
            Créer un compte
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 text-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20"
          >
            Accéder au Dashboard
          </Link>
        </div>

        {/* Technical Architecture Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Framework &amp; UI
            </span>
            <span className="text-slate-200 font-medium text-sm">Next.js App Router (Standalone)</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Sécurité &amp; Sessions
            </span>
            <span className="text-slate-200 font-medium text-sm">JWT HTTP-only + RBAC</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              State &amp; Analytics
            </span>
            <span className="text-slate-200 font-medium text-sm">React Query + Recharts</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Persistance &amp; Base
            </span>
            <span className="text-slate-200 font-medium text-sm">PostgreSQL 16 + Prisma</span>
          </div>
        </div>

        <div className="border-t border-slate-700/80 pt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Plateforme opérationnelle</span>
          <span className="font-mono bg-slate-900 px-2.5 py-1 rounded text-slate-300 border border-slate-700">
            http://localhost:3000
          </span>
        </div>
      </div>
    </main>
  );
}
