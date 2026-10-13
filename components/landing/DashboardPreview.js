export default function DashboardPreview() {
  const sampleEndpoints = [
    {
      method: 'GET',
      methodColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      name: 'Service de Paiement — Stripe Gateway',
      url: 'https://api.stripe.com/v1/health',
      status: '200 OK',
      latency: '42 ms',
      interval: '60s',
      uptime: '99.98%',
    },
    {
      method: 'POST',
      methodColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      name: 'Serveur d’Authentification — OAuth2',
      url: 'https://auth.apiwatch.internal/oauth/v2/token',
      status: '200 OK',
      latency: '118 ms',
      interval: '300s',
      uptime: '99.91%',
    },
    {
      method: 'GET',
      methodColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      name: 'API Publique — Métriques & Télémétrie',
      url: 'https://data.apiwatch.dev/v1/metrics',
      status: '200 OK',
      latency: '67 ms',
      interval: '60s',
      uptime: '100.0%',
    },
  ];

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Halo subtil en arrière-plan */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-sky-500/15 to-emerald-500/20 blur-xl opacity-70"></div>

      {/* Cadre de fenêtre applicative */}
      <div className="relative rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Barre supérieure de fenêtre (Chrome navigateur) */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>app.apiwatch.dev/dashboard</span>
          </div>

          {/* Badge officiel de transparence */}
          <div className="text-[11px] font-medium text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
            Aperçu illustratif de l&apos;interface
          </div>
        </div>

        {/* Intérieur fidèle du Dashboard */}
        <div className="p-5 sm:p-6 space-y-6 bg-slate-900/95">
          {/* Barre de contrôle supérieure du dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Supervision de Production
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● 100% Opérationnel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Surveillance de la disponibilité, de la latence et des incidents en direct.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Pings automatiques actifs</span>
              <div className="px-3 py-1.5 rounded-xl bg-indigo-600/90 text-white text-xs font-medium shadow-sm">
                + Ajouter une API
              </div>
            </div>
          </div>

          {/* 4 Cartes de métriques fidèles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-850/70 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Disponibilité (30j)</span>
                <span className="text-emerald-400 font-medium">99.94%</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">99.94%</div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[99.9%]"></div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-850/70 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Temps de réponse</span>
                <span className="text-sky-400 font-medium">Stable</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">84 ms</div>
              <div className="text-[11px] text-slate-500">Moyenne sur 24h</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-850/70 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>APIs surveillées</span>
                <span className="text-indigo-400 font-medium">3 actives</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-white">3 / 3</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span>●</span> Tous les services sont UP
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-850/70 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Incidents ouverts</span>
                <span className="text-slate-400 font-medium">0 en cours</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400">0</div>
              <div className="text-[11px] text-slate-500">Dernier résolu il y a 8j</div>
            </div>
          </div>

          {/* Liste illustrative des APIs surveillées */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
              <span>Endpoints sous surveillance (Échantillon illustratif)</span>
              <span>Dernier contrôle</span>
            </div>

            {sampleEndpoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-850/50 border border-slate-800/90 hover:border-slate-750 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${ep.methodColor}`}>
                    {ep.method}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <span>{ep.name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        UP
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                      {ep.url}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-5 text-xs text-slate-300 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/70">
                  <div className="text-left md:text-right">
                    <span className="text-emerald-400 font-semibold">{ep.status}</span>
                    <span className="text-slate-500 ml-2">({ep.latency})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Toutes les {ep.interval}</span>
                  </div>
                  <div className="hidden sm:block text-right font-medium text-emerald-400">
                    {ep.uptime}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Micro barre d'historique de santé */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Historique de disponibilité des contrôles (30 derniers jours)</span>
              <span className="text-emerald-400 font-medium">100% opérationnel</span>
            </div>
            <div className="flex items-center gap-1 overflow-hidden">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-5 rounded-xs bg-emerald-500/80 hover:bg-emerald-400 transition-colors"
                  title={`Jour ${i + 1} : 100% de disponibilité`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Note d'information claire sur la nature illustrative */}
      <p className="mt-3 text-center text-xs text-slate-400">
        * Données et métriques présentées à titre d&apos;exemple illustratif de l&apos;interface du dashboard APIWatch.
      </p>
    </div>
  );
}
