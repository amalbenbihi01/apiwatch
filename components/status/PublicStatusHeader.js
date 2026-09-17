'use client';

export default function PublicStatusHeader({ title, description, globalStatus, updatedAt }) {
  const getBannerConfig = () => {
    switch (globalStatus) {
      case 'ALL_OPERATIONAL':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-400',
          title: 'Tous les systèmes sont opérationnels',
          desc: 'Tous nos services et API fonctionnent normalement sans interruption.',
        };
      case 'DEGRADED':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          title: 'Performances dégradées',
          desc: 'Certains services subissent des lenteurs ou des taux d\'erreur élevés.',
        };
      case 'MAJOR_OUTAGE':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          dot: 'bg-rose-500',
          title: 'Panne majeure',
          desc: 'Un ou plusieurs services sont actuellement indisponibles. Nos équipes interviennent.',
        };
      default:
        return {
          bg: 'bg-slate-800 border-slate-700 text-slate-300',
          dot: 'bg-slate-400',
          title: 'État du système non disponible',
          desc: 'Aucune donnée récente de mesure.',
        };
    }
  };

  const banner = getBannerConfig();

  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Page Brand & Description */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          {title || 'Statut des Services'}
        </h1>
        {description && (
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Main Status Banner */}
      <div className={`p-6 rounded-2xl border shadow-lg ${banner.bg} transition-all`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <span className="relative flex h-4 w-4 mt-1 sm:mt-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${banner.dot}`} />
              <span className={`relative inline-flex rounded-full h-4 w-4 ${banner.dot}`} />
            </span>
            <div>
              <h2 className="text-xl font-bold">{banner.title}</h2>
              <p className="text-xs opacity-90 mt-0.5">{banner.desc}</p>
            </div>
          </div>

          {formattedTime && (
            <div className="text-right text-xs opacity-75 font-mono">
              Mis à jour à {formattedTime} (quasi t-réel 30s)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
