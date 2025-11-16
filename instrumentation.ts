export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run in Node.js runtime (not in Edge runtime)
    const { startScheduler } = await import('./lib/automation-scheduler');
    startScheduler();
  }
}

