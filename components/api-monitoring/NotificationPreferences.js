'use client';

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';

export default function NotificationPreferences() {
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();

  const handleToggle = () => {
    if (!preferences) return;
    updateMutation.mutate({
      emailNotificationsEnabled: !preferences.emailNotificationsEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl animate-pulse text-xs text-slate-400">
        Chargement des préférences d&apos;alerte...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-rose-400 text-xs">
        {error.message || 'Erreur lors du chargement des préférences'}
      </div>
    );
  }

  const isEnabled = preferences?.emailNotificationsEnabled;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <span>📧 Alertes & Notifications Email</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Recevez un email immédiatement lors de l&apos;ouverture et de la résolution d&apos;un incident.
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={updateMutation.isPending}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
        <span className="text-slate-400">Statut des alertes :</span>
        <span className={`font-semibold ${isEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
          {isEnabled ? '🟢 Notifications Email Activées' : '⚪ Notifications Email Désactivées'}
        </span>
      </div>
    </div>
  );
}
