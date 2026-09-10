export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-700 pb-4">
          <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            APIWatch — Étape 1 Initialisée
          </h1>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">
          La base de la plateforme de surveillance d&apos;APIs et de gestion d&apos;incidents est prête.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Framework
            </span>
            <span className="text-slate-200 font-medium">Next.js (App Router, JS)</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Styling
            </span>
            <span className="text-slate-200 font-medium">Tailwind CSS</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              State / Fetching
            </span>
            <span className="text-slate-200 font-medium">TanStack React Query</span>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700/50">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Database / ORM
            </span>
            <span className="text-slate-200 font-medium">PostgreSQL + Prisma</span>
          </div>
        </div>

        <div className="border-t border-slate-700/80 pt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Status: Configuration de base OK</span>
          <span className="font-mono bg-slate-900 px-2.5 py-1 rounded text-slate-300 border border-slate-700">
            http://localhost:3000
          </span>
        </div>
      </div>
    </main>
  );
}
