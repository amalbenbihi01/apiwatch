export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 1. Validate critical environment variables and production secrets
    const { validateEnvironment } = await import('./lib/env-check.js');
    validateEnvironment();

    // 2. Start background monitoring scheduler
    const { startMonitoringScheduler } = await import('./lib/scheduler.js');
    startMonitoringScheduler();
  }
}
