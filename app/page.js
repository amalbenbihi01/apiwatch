import Link from 'next/link';
import { getSession } from '@/lib/auth';
import LandingNavbar from '@/components/landing/LandingNavbar';
import DashboardPreview from '@/components/landing/DashboardPreview';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata = {
  title: 'APIWatch — Plateforme de Surveillance d’APIs & Gestion d’Incidents',
  description:
    'Surveillez la disponibilité et la latence de vos APIs en temps réel. Recevez des alertes d’incidents instantanées et publiez des pages de statut transparentes.',
};

export default async function Home() {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.userId);

  const realFeatures = [
    {
      title: 'Health Checks Automatisés',
      description:
        'Contrôles périodiques récurrents avec support complet des méthodes HTTP (GET, POST, PUT, DELETE, PATCH, HEAD), validation du code d’état attendu et surveillance des seuils de latence.',
      badge: 'Surveillance HTTP',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Gestion & Suivi d’Incidents',
      description:
        'Détection instantanée des pannes avec horodatage précis du début et de la fin de l’incident, calcul automatisé de la durée d’interruption et conservation de l’historique des coupures.',
      badge: 'Disponibilité',
      icon: (
        <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      title: 'Alertes E-mail en Temps Réel',
      description:
        'Notifications immédiates acheminées par serveur SMTP dès qu’un endpoint devient indisponible, suivies d’un e-mail de confirmation dès la résolution de l’incident.',
      badge: 'Notifications SMTP',
      icon: (
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Journaux d’Audit & Analytics',
      description:
        'Historique granulaire de chaque vérification effectuée, distribution des codes HTTP (2xx, 4xx, 5xx), métriques de temps de réponse moyen et export complet au format CSV.',
      badge: 'Observabilité',
      icon: (
        <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Espaces d’Équipe & Contrôle RBAC',
      description:
        'Organisation collaborative avec permissions strictes (Propriétaire, Administrateur, Membre, Lecteur) et invitations par e-mail protégées par des jetons cryptographiques sécurisés.',
      badge: 'Collaboration',
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: 'Pages de Statut Publiques Hébergées',
      description:
        'Publication d’une page de statut personnalisée sous une URL dédiée (/status/:slug) pour communiquer la fiabilité de votre infrastructure à vos clients en toute transparence.',
      badge: 'Transparence Client',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Déclarez vos endpoints',
      description:
        'Indiquez l’URL de votre API, la méthode HTTP (GET, POST...), la fréquence de test souhaitée et configurez les en-têtes ou codes de réponse attendus.',
    },
    {
      step: '02',
      title: 'Surveillance automatisée',
      description:
        'APIWatch exécute les vérifications aux intervalles programmés, mesure la latence exacte en millisecondes et enregistre l’historique de chaque réponse.',
    },
    {
      step: '03',
      title: 'Alerte et communication',
      description:
        'En cas d’anomalie ou de panne prolongée, votre équipe est alertée par e-mail et votre page de statut publique reflète l’état du service en temps réel.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* 1. Header public unifié */}
      <LandingNavbar isAuthenticated={isAuthenticated} />

      <main className="flex-1 space-y-20 sm:space-y-28 pb-20">
        {/* 2. Hero Section */}
        <section className="relative pt-12 sm:pt-20 lg:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
          {/* Badge d'accroche */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium">Surveillance continue &amp; Observabilité des APIs</span>
          </div>

          {/* Titre principal et proposition de valeur */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Surveillez la santé de vos APIs en temps réel.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400">
                Détectez les pannes avant vos utilisateurs.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              APIWatch automatise vos contrôles de disponibilité HTTP, calcule vos métriques de latence, alerte votre équipe par e-mail et publie vos pages de statut en toute transparence.
            </p>
          </div>

          {/* Boutons d'action contextuels */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/25"
                >
                  <span>Accéder à mon Dashboard</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#fonctionnalites"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white font-medium px-6 py-3.5 rounded-xl text-sm transition-colors border border-slate-800"
                >
                  Explorer les fonctionnalités
                </a>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/25"
                >
                  <span>Créer un compte</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#apercu"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white font-medium px-6 py-3.5 rounded-xl text-sm transition-colors border border-slate-800"
                >
                  Découvrir la plateforme
                </a>
              </>
            )}
          </div>

          {/* Garanties factuelles et techniques */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Surveillance continue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Multi-équipes RBAC
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Alertes en direct
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Pages de statut publiques
            </span>
          </div>
        </section>

        {/* 3. Section Aperçu Visuel du Produit */}
        <section id="apercu" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Une interface d’observabilité claire et opérationnelle
            </h2>
            <p className="text-sm text-slate-400">
              Visualisez instantanément la disponibilité, les temps de réponse et l’état de santé de vos microservices et points d’accès.
            </p>
          </div>

          <DashboardPreview />
        </section>

        {/* 4. Grille des Fonctionnalités Clés */}
        <section id="fonctionnalites" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Capacités de la plateforme
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tout le nécessaire pour superviser vos APIs
            </h2>
            <p className="text-sm text-slate-400">
              Des outils robustes pensés pour vous aider à garantir la disponibilité de vos services et réduire le temps moyen de résolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {realFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all hover:bg-slate-900 group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center">
                    {feat.icon}
                  </div>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {feat.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Parcours : Fonctionnement en 3 étapes */}
        <section id="fonctionnement" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Workflow simplifié
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Comment fonctionne APIWatch ?
            </h2>
            <p className="text-sm text-slate-400">
              Une mise en place rapide en trois étapes simples pour démarrer la surveillance sans complexité inutile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/90 relative space-y-4"
              >
                <div className="text-3xl font-extrabold text-slate-800 font-mono">
                  {st.step}
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  {st.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {st.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Section Focus : Page de Statut Publique */}
        <section id="status-page" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Fonctionnalité intégrée
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Communiquez la santé de vos services en toute transparence
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Grâce aux pages de statut publiques (/status/:slug), partagez l’état opérationnel de vos APIs avec vos clients et collaborateurs sans exposer les paramètres internes de votre infrastructure.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href={isAuthenticated ? '/dashboard/status-page' : '/register'}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors text-center shadow-lg shadow-indigo-600/20"
                >
                  {isAuthenticated ? 'Configurer ma Status Page' : 'Créer ma Status Page'}
                </Link>
              </div>
            </div>

            {/* Carte d'illustration de la page de statut */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-semibold text-white">Exemple de statut public</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">/status/acme-corp</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <div>
                    <div className="text-sm font-bold text-emerald-400">Tous les services sont opérationnels</div>
                    <div className="text-xs text-slate-400">Disponibilité globale constatée sur les dernières 24 heures</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/20 hidden sm:inline">
                  99.98%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Appel à l'action final (CTA Banner) */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 text-center space-y-6 shadow-2xl">
            <div className="space-y-3 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Prêt à surveiller la fiabilité de vos APIs ?
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Rejoignez APIWatch dès aujourd’hui pour automatiser la surveillance de vos services, détecter les pannes en amont et rassurer vos utilisateurs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/25"
                >
                  <span>Accéder à mon Dashboard</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/25"
                  >
                    <span>Créer un compte</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium px-6 py-3.5 rounded-xl text-sm transition-colors border border-slate-700"
                  >
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer professionnel */}
      <LandingFooter />
    </div>
  );
}
