export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMonitoringScheduler } = await import('./lib/scheduler.js');
    startMonitoringScheduler();
  }
}
