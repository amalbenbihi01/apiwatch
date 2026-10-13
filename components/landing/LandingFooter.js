import Link from 'next/link';

export default function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Colonne 1 : Présentation APIWatch & Cadre Académique */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span className="font-bold text-lg text-white tracking-tight">APIWatch</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plateforme de surveillance continue d&apos;APIs, de détection d&apos;incidents et de publication de pages de statut.
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="text-slate-300 font-semibold block">Cadre du projet</span>
              <p>Projet de fin d&apos;études — Plateforme d&apos;observabilité et de monitoring pour services web.</p>
            </div>
          </div>

          {/* Colonne 2 : Espace Public */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Espace Public
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Connexion à la plateforme
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Créer un compte
                </Link>
              </li>
              <li>
                <a href="#fonctionnalites" className="hover:text-white transition-colors">
                  Fonctionnalités détaillées
                </a>
              </li>
              <li>
                <a href="#status-page" className="hover:text-white transition-colors">
                  Pages de statut publiques
                </a>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Espace Authentifié (Session Requise) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Espace Authentifié
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                Session requise
              </span>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Tableau de bord de surveillance
                </Link>
              </li>
              <li>
                <Link href="/dashboard/logs" className="hover:text-white transition-colors">
                  Journaux de vérification &amp; Analytics
                </Link>
              </li>
              <li>
                <Link href="/dashboard/status-page" className="hover:text-white transition-colors">
                  Configuration de la Page de Statut
                </Link>
              </li>
              <li>
                <Link href="/dashboard/team" className="hover:text-white transition-colors">
                  Gestion d&apos;équipe &amp; Rôles RBAC
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Architecture & Stack Technique */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Architecture &amp; Stack
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>Frontend &amp; Routing</span>
                <span className="text-slate-200 font-mono text-[11px]">Next.js App Router</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>Styles &amp; UI</span>
                <span className="text-slate-200 font-mono text-[11px]">Tailwind CSS</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>Base &amp; ORM</span>
                <span className="text-slate-200 font-mono text-[11px]">PostgreSQL + Prisma</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span>Gestion d&apos;état</span>
                <span className="text-slate-200 font-mono text-[11px]">TanStack Query</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Authentification</span>
                <span className="text-slate-200 font-mono text-[11px]">JWT HTTP-only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barre inférieure de copyright */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} APIWatch — Tous droits réservés.</p>
          <p className="text-center sm:text-right text-slate-400">
            Plateforme d&apos;observabilité conçue pour la surveillance d&apos;infrastructures logicielles.
          </p>
        </div>
      </div>
    </footer>
  );
}
