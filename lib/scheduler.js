import { runAutomaticMonitoring } from '../services/monitoring-service.js';

let isExecuting = false;

export function startMonitoringScheduler() {
  const globalObj = globalThis;

  if (globalObj.__apiwatch_scheduler_active__) {
    console.log('[Scheduler] Le scheduler est déjà actif dans ce processus Node.');
    return;
  }

  globalObj.__apiwatch_scheduler_active__ = true;

  const intervalMinutes = parseInt(process.env.MONITORING_INTERVAL_MINUTES || '5', 10);
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  console.log(`[Scheduler] Initialisation du monitoring automatique (intervalle : ${intervalMinutes} min)...`);

  const executeCycle = async () => {
    if (isExecuting) {
      console.log('[Scheduler] Un cycle est déjà en cours d’exécution, saut du cycle.');
      return;
    }

    isExecuting = true;
    try {
      await runAutomaticMonitoring();
    } catch (error) {
      console.error('[Scheduler Error] Erreur inattendue durant le cycle de monitoring:', error);
    } finally {
      isExecuting = false;
    }
  };

  // Immediate initial check on startup
  executeCycle();

  // Recurring interval schedule
  const timer = setInterval(executeCycle, intervalMs);

  // Prevent interval from blocking Node process exit if needed
  if (timer.unref) {
    timer.unref();
  }
}
