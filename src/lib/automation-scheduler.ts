import cron from 'node-cron';
import { checkAndExecuteTasks } from './automation-worker';

let schedulerRunning = false;

/**
 * Start the automation scheduler
 * This will check for due tasks every minute
 */
export function startScheduler() {
  if (schedulerRunning) {
    console.log('[Scheduler] Already running');
    return;
  }

  console.log('[Scheduler] Starting automation task scheduler...');

  // Check every minute for due tasks
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndExecuteTasks();
    } catch (error) {
      console.error('[Scheduler] Error in scheduled check:', error);
    }
  });

  schedulerRunning = true;
  console.log('[Scheduler] Automation scheduler started (checking every minute)');
}

/**
 * Stop the scheduler (if needed)
 */
export function stopScheduler() {
  schedulerRunning = false;
  console.log('[Scheduler] Stopped');
}

