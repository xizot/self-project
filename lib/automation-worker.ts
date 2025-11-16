import db from './db';
import { AutomationTask, Password } from './types';
import { decryptPassword } from './password-encryption';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Check if logs should be shown (default: true)
const SHOW_LOGS = process.env.AUTOMATION_SHOW_LOGS !== 'false';

/**
 * Execute an automation task
 */
export async function executeTask(task: AutomationTask): Promise<{
  success: boolean;
  output?: string;
  error?: string;
}> {
  try {
    if (SHOW_LOGS) {
      console.log(`[Automation Worker] Executing task: ${task.name} (ID: ${task.id})`);
    }

    let result: { success: boolean; output?: string; error?: string };

    switch (task.type) {
      case 'script': {
        // Parse config to get script path
        let scriptPath: string;
        try {
          const config = JSON.parse(task.config);
          scriptPath = config.path || task.config;
        } catch {
          scriptPath = task.config;
        }

        // Resolve script path
        const fullPath = path.isAbsolute(scriptPath)
          ? scriptPath
          : path.join(process.cwd(), scriptPath);

        // Check if script exists
        if (!fs.existsSync(fullPath)) {
          throw new Error(`Script not found: ${fullPath}`);
        }

        // Execute script
        if (SHOW_LOGS) {
          console.log(`[Automation Worker] Running script: ${fullPath}`);
        }

        // Execute script and stream output in real-time
        const scriptProcess = spawn('node', [fullPath], {
          cwd: process.cwd(),
          stdio: ['inherit', 'pipe', 'pipe'], // stdin: inherit, stdout/stderr: pipe
        });

        let stdout = '';
        let stderr = '';

        // Stream stdout to console in real-time (only if logs enabled)
        scriptProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          stdout += output;
          // Log each line as it comes
          if (SHOW_LOGS) {
            output.split('\n').forEach((line: string) => {
              if (line.trim()) {
                console.log(`[Script ${task.name}] ${line}`);
              }
            });
          }
        });

        // Stream stderr to console in real-time (only if logs enabled)
        scriptProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          stderr += output;
          // Log each line as it comes
          if (SHOW_LOGS) {
            output.split('\n').forEach((line: string) => {
              if (line.trim()) {
                console.warn(`[Script ${task.name}] ${line}`);
              }
            });
          }
        });

        // Wait for script to complete
        await new Promise<void>((resolve, reject) => {
          scriptProcess.on('close', (code: number) => {
            if (code !== 0 && !stderr) {
              reject(new Error(`Script exited with code ${code}`));
            } else {
              resolve();
            }
          });
          scriptProcess.on('error', (error: Error) => {
            reject(error);
          });
        });

        result = {
          success: true,
          output: stdout,
          error: stderr || undefined,
        };
        break;
      }

      case 'http_request': {
        // Parse config
        let config: { url: string; method?: string; headers?: Record<string, string>; body?: string };
        try {
          config = JSON.parse(task.config);
        } catch {
          config = { url: task.config, method: 'GET' };
        }

        if (SHOW_LOGS) {
          console.log(`[Automation Worker] Making HTTP ${config.method || 'GET'} request to: ${config.url}`);
        }

        // Make HTTP request
        const response = await fetch(config.url, {
          method: config.method || 'GET',
          headers: config.headers || {},
          body: config.body,
        });

        const responseText = await response.text();

        // Log HTTP response to console (only if logs enabled)
        if (SHOW_LOGS) {
          if (response.ok) {
            console.log(`[Automation Worker] HTTP request successful (${task.name}): Status ${response.status}`);
            if (responseText) {
              console.log(`[Automation Worker] Response body (${task.name}):\n${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
            }
          } else {
            console.error(`[Automation Worker] HTTP request failed (${task.name}): Status ${response.status}`);
            console.error(`[Automation Worker] Error response (${task.name}):\n${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
          }
        }

        result = {
          success: response.ok,
          output: responseText,
          error: response.ok ? undefined : `HTTP ${response.status}: ${responseText}`,
        };
        break;
      }


      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    // Send result to webhook if configured
    if (task.webhook_id) {
      try {
        const webhook = db
          .prepare('SELECT * FROM passwords WHERE id = ? AND type = ?')
          .get(task.webhook_id, 'webhook') as Password | undefined;

        if (webhook) {
          const webhookUrl = decryptPassword(webhook.password);
          const payload = {
            task_id: task.id,
            task_name: task.name,
            success: result.success,
            output: result.output,
            error: result.error,
            timestamp: new Date().toISOString(),
            run_count: (task.run_count || 0) + 1,
          };

          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (SHOW_LOGS) {
            if (!webhookResponse.ok) {
              console.warn(`[Automation Worker] Webhook returned ${webhookResponse.status} for ${webhook.app_name}`);
            } else {
              console.log(`[Automation Worker] Sent result to webhook: ${webhook.app_name}`);
            }
          }
        }
      } catch (webhookError) {
        if (SHOW_LOGS) {
          console.error(`[Automation Worker] Error sending webhook:`, webhookError);
        }
        // Don't fail the task if webhook fails
      }
    }

    // Update task after execution (only if task is still enabled)
    const now = new Date().toISOString();

    // Check if task is still enabled before scheduling next run
    const currentTask = db
      .prepare('SELECT enabled FROM automation_tasks WHERE id = ?')
      .get(task.id) as { enabled: number } | undefined;

    if (currentTask && currentTask.enabled === 1) {
      const nextRunAt = calculateNextRun(task.schedule);
      db.prepare(`
        UPDATE automation_tasks
        SET last_run_at = ?,
            next_run_at = ?,
            run_count = run_count + 1,
            updated_at = ?
        WHERE id = ?
      `).run(now, nextRunAt, now, task.id);
    } else {
      // Task was disabled, don't schedule next run
      db.prepare(`
        UPDATE automation_tasks
        SET last_run_at = ?,
            run_count = run_count + 1,
            updated_at = ?
        WHERE id = ?
      `).run(now, now, task.id);
      if (SHOW_LOGS) {
        console.log(`[Automation Worker] Task ${task.name} was disabled, not scheduling next run`);
      }
    }

    if (SHOW_LOGS) {
      console.log(`[Automation Worker] Task ${task.name} completed successfully`);

      // Log output to console
      if (result.output) {
        console.log(`[Automation Worker] Output for ${task.name}:`, result.output);
      }
      if (result.error) {
        console.warn(`[Automation Worker] Error output for ${task.name}:`, result.error);
      }
    }

    return result;
  } catch (error: any) {
    if (SHOW_LOGS) {
      console.error(`[Automation Worker] Error executing task ${task.name}:`, error);
    }

    const errorResult = {
      success: false,
      error: error.message || String(error),
    };

    // Update task with error
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE automation_tasks
      SET last_run_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, task.id);

    // Log error to console (only if logs enabled)
    if (SHOW_LOGS) {
      console.error(`[Automation Worker] Error details for ${task.name}:`, errorResult.error);
    }

    return errorResult;
  }
}

/**
 * Check and execute tasks that are due
 */
export async function checkAndExecuteTasks(): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Get all enabled tasks that are due
    const tasks = db
      .prepare(`
        SELECT * FROM automation_tasks
        WHERE enabled = 1
          AND (next_run_at IS NULL OR next_run_at <= ?)
        ORDER BY next_run_at ASC
      `)
      .all(now) as AutomationTask[];

    if (tasks.length === 0) {
      return;
    }

    console.log(`[Automation Worker] Found ${tasks.length} task(s) to execute`);

    // Execute tasks in parallel (or sequentially if needed)
    for (const task of tasks) {
      await executeTask(task);
    }
  } catch (error) {
    console.error('[Automation Worker] Error checking tasks:', error);
  }
}

/**
 * Calculate next run time based on schedule
 */
function calculateNextRun(schedule: string): string {
  const now = new Date();

  // Check if it's an interval (e.g., "15s", "30s", "1h", "30m", "1d", "1w")
  const intervalMatch = schedule.match(/^(\d+)([smhdw])$/);
  if (intervalMatch) {
    const value = parseInt(intervalMatch[1]);
    const unit = intervalMatch[2];
    const nextRun = new Date(now);

    if (unit === 's') {
      nextRun.setSeconds(nextRun.getSeconds() + value);
    } else if (unit === 'm') {
      nextRun.setMinutes(nextRun.getMinutes() + value);
    } else if (unit === 'h') {
      nextRun.setHours(nextRun.getHours() + value);
    } else if (unit === 'd') {
      nextRun.setDate(nextRun.getDate() + value);
    } else if (unit === 'w') {
      nextRun.setDate(nextRun.getDate() + value * 7);
    }

    return nextRun.toISOString();
  }

  // Default: 1 hour from now
  const nextRun = new Date(now);
  nextRun.setHours(nextRun.getHours() + 1);
  return nextRun.toISOString();
}

