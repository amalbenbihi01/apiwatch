'use client';

import { useState, useEffect } from 'react';
import {
  useUpdateDashboardPreferences,
  useResetDashboardPreferences,
} from '@/hooks/use-dashboard-preferences';

const WIDGET_METADATA = {
  overview: {
    title: 'Vue Globale',
    icon: '📊',
    description: 'KPIs principaux : Total, UP/DOWN, Uptime 24h, Latence, Incidents ouverts',
  },
  'api-status': {
    title: 'Statut des APIs',
    icon: '⚡',
    description: 'Liste des monitors avec statut instantané et temps de réponse',
  },
  uptime: {
    title: 'Disponibilité & Uptime',
    icon: '🛡️',
    description: 'Taux de disponibilité sur 24h et jauge opérationnelle',
  },
  'response-time': {
    title: 'Temps de Réponse',
    icon: '📈',
    description: 'Graphique Recharts d’évolution de la latence moyenne par créneau',
  },
  incidents: {
    title: 'Journal des Incidents',
    icon: '🚨',
    description: 'Historique et statut des incidents ouverts et résolus',
  },
  activity: {
    title: 'Activité Récente',
    icon: '⏱️',
    description: 'Flux chronologique des derniers contrôles et événements',
  },
  'health-summary': {
    title: 'Santé du Système',
    icon: '🩺',
    description: 'Répartition proportionnelle des services UP vs DOWN',
  },
};

export default function DashboardCustomizerModal({
  isOpen,
  onClose,
  initialWidgets = [],
}) {
  const [widgets, setWidgets] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const updateMutation = useUpdateDashboardPreferences();
  const resetMutation = useResetDashboardPreferences();

  useEffect(() => {
    if (isOpen && initialWidgets) {
      // Clone and ensure sorted by order
      const sorted = [...initialWidgets].sort((a, b) => a.order - b.order);
      setWidgets(sorted);
      setSaveSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, initialWidgets]);

  if (!isOpen) return null;

  const handleToggleVisibility = (id) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const handleSizeChange = (id, newSize) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size: newSize } : w))
    );
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    setWidgets((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy.map((w, idx) => ({ ...w, order: idx }));
    });
  };

  const handleMoveDown = (index) => {
    if (index >= widgets.length - 1) return;
    setWidgets((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy.map((w, idx) => ({ ...w, order: idx }));
    });
  };

  const handleSave = async () => {
    setErrorMessage('');
    try {
      await updateMutation.mutateAsync({ widgets });
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMessage(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Voulez-vous réinitialiser le tableau de bord aux paramètres par défaut ?')) {
      return;
    }
    setErrorMessage('');
    try {
      const res = await resetMutation.mutateAsync();
      if (res?.preferences?.widgets) {
        setWidgets(res.preferences.widgets);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMessage(err.message || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl p-6 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚙️</span> Personnaliser le Dashboard
            </h2>
            <p className="text-xs text-slate-400">
              Modifiez l'ordre, la taille et la visibilité des widgets pour cette équipe.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <span>✓</span> Préférences enregistrées avec succès !
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        {/* Widgets List */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {widgets.map((widget, index) => {
            const meta = WIDGET_METADATA[widget.id] || {
              title: widget.id,
              icon: '📦',
              description: 'Widget de tableau de bord',
            };

            return (
              <div
                key={widget.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  widget.visible
                    ? 'bg-slate-850 border-slate-750 text-slate-100'
                    : 'bg-slate-950/60 border-slate-850 opacity-60 text-slate-400'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {meta.title}
                      </span>
                      {!widget.visible && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Masqué
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{meta.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Size Selector */}
                  <select
                    value={widget.size}
                    onChange={(e) => handleSizeChange(widget.id, e.target.value)}
                    disabled={!widget.visible}
                    className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
                  >
                    <option value="small">Petit (1x)</option>
                    <option value="medium">Moyen (2x)</option>
                    <option value="large">Grand (3x)</option>
                  </select>

                  {/* Reorder Buttons */}
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="Monter le widget"
                      className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 text-xs transition-colors"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === widgets.length - 1}
                      title="Descendre le widget"
                      className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 text-xs transition-colors border-l border-slate-700"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(widget.id)}
                    title={widget.visible ? 'Masquer ce widget' : 'Afficher ce widget'}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      widget.visible
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {widget.visible ? 'Visible' : 'Masqué'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {resetMutation.isPending ? 'Réinitialisation...' : '🔄 Réinitialiser par défaut'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
