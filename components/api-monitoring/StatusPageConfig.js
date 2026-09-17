'use client';

import { useState, useEffect } from 'react';
import { useStatusPageConfig, useUpdateStatusPageConfig } from '@/hooks/use-status-page';

export default function StatusPageConfig() {
  const { data: config, isLoading, isError, error } = useStatusPageConfig();
  const updateMutation = useUpdateStatusPageConfig();

  const [isEnabled, setIsEnabled] = useState(false);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishedEndpointIds, setPublishedEndpointIds] = useState([]);

  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync state when config is fetched
  useEffect(() => {
    if (config?.statusPage) {
      setIsEnabled(config.statusPage.isEnabled || false);
      setSlug(config.statusPage.slug || '');
      setTitle(config.statusPage.title || 'Statut des Services');
      setDescription(config.statusPage.description || '');
      setPublishedEndpointIds(config.statusPage.publishedEndpointIds || []);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 flex items-center justify-center space-x-3 text-slate-400">
        <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Chargement de la configuration de la Page de Statut...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-6 rounded-xl space-y-2">
        <h3 className="font-semibold text-lg">Erreur de chargement</h3>
        <p className="text-sm">{error?.message || 'Impossible de charger la configuration.'}</p>
      </div>
    );
  }

  const endpoints = config?.endpoints || [];

  const handleSlugChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(val);
    setFormError('');
  };

  const handleToggleEndpoint = (id) => {
    setPublishedEndpointIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEndpoints = () => {
    setPublishedEndpointIds(endpoints.map((ep) => ep.id));
  };

  const handleDeselectAllEndpoints = () => {
    setPublishedEndpointIds([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    // Slug validation
    if (!slug || slug.trim().length < 3) {
      setFormError('Le slug doit contenir au moins 3 caractères.');
      return;
    }
    if (slug.length > 50) {
      setFormError('Le slug ne peut pas dépasser 50 caractères.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setFormError('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.');
      return;
    }

    updateMutation.mutate(
      {
        isEnabled,
        slug: slug.trim(),
        title: title.trim(),
        description: description.trim(),
        publishedEndpointIds,
      },
      {
        onSuccess: () => {
          setSuccessMsg('Configuration enregistrée avec succès !');
          setTimeout(() => setSuccessMsg(''), 4000);
        },
        onError: (err) => {
          if (err.status === 409 || err.message?.includes('déjà utilisé')) {
            setFormError('Ce slug est déjà utilisé par une autre page de statut. Veuillez en choisir un autre.');
          } else {
            setFormError(err.message || 'Erreur lors de la sauvegarde.');
          }
        },
      }
    );
  };

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/status/${slug}`
    : `/status/${slug}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🌐</span> Page de Statut Publique
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Partagez la disponibilité et la santé de vos services avec vos utilisateurs.
          </p>
        </div>

        {/* Global Toggle Switch */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/60 px-4 py-2 rounded-lg">
          <span className="text-sm font-medium text-slate-300">
            {isEnabled ? 'Page Active' : 'Page Désactivée'}
          </span>
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isEnabled ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {formError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>⚠️ {formError}</span>
          <button onClick={() => setFormError('')} className="text-rose-400 hover:text-rose-200">×</button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
          ✓ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Slug input & URL Preview */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            URL Personnalisée (Slug)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="flex-1 flex items-center bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm">
              <span className="text-slate-500 select-none">.../status/</span>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="mon-entreprise"
                className="bg-transparent border-none text-white focus:outline-none flex-1 font-mono text-emerald-400 ml-1"
                required
              />
            </div>
            {isEnabled && slug && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-600 transition-colors whitespace-nowrap"
                >
                  {copied ? '✓ Copié !' : '📋 Copier le lien'}
                </button>
                <a
                  href={`/status/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <span>Voir la page</span>
                  <span>↗</span>
                </a>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Uniquement lettres minuscules, chiffres et tirets (3-50 caractères).
          </p>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Titre de la Page
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Statut des Services - Mon Entreprise"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-200">
            Description / Message Public (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bienvenue sur notre page de statut. Vous pouvez consulter ici la santé en temps réel de nos API et services."
            rows={3}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
        </div>

        {/* Published Endpoints selection */}
        <div className="space-y-3 border-t border-slate-700 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                APIs publiées sur la page de statut
              </h3>
              <p className="text-xs text-slate-400">
                Sélectionnez les endpoints d&apos;API qui doivent figurer publiquement.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllEndpoints}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Tout sélectionner
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={handleDeselectAllEndpoints}
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                Tout désélectionner
              </button>
            </div>
          </div>

          {endpoints.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-lg text-center text-xs text-slate-400">
              Aucune API configurée. Veuillez d&apos;abord ajouter des APIs dans le dashboard.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {endpoints.map((ep) => {
                const isSelected = publishedEndpointIds.includes(ep.id);
                return (
                  <label
                    key={ep.id}
                    className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-100'
                        : 'bg-slate-900/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleEndpoint(ep.id)}
                      className="mt-1 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3 text-xs space-y-0.5">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span>{ep.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-300">
                          {ep.method}
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]">
                        {ep.url}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="border-t border-slate-700 pt-4 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center space-x-2"
          >
            {updateMutation.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>Enregistrer les modifications</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
