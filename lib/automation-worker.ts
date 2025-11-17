import db from './db';
import { AutomationTask, Password } from './types';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { sendWebhookNotification, TaskResult, ScriptResponse } from './webhook-handlers';
import redis from './redis';
import { randomUUID } from 'crypto';
import { decryptPassword } from './password-encryption';

// Check if logs should be shown (default: true)
const SHOW_LOGS = process.env.AUTOMATION_SHOW_LOGS !== 'false';

/**
 * Execute an automation task
 */
export async function executeTask(task: AutomationTask): Promise<TaskResult> {
  try {
    if (SHOW_LOGS) {
      console.log(`[Automation Worker] Executing task: ${task.name} (ID: ${task.id})`);
    }

    let result: TaskResult;

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

        // Generate unique ID for this script execution
        const executionId = randomUUID();
        const redisKey = `automation:result:${executionId}`;

        // Parse config to get credential_id or other configs
        let taskConfig: any = {};
        try {
          taskConfig = JSON.parse(task.config);
        } catch {
          // Config is not JSON, treat as string path
        }

        // Get credentials from passwords table if credential_id is specified
        const envVars: NodeJS.ProcessEnv = {
          ...process.env,
          AUTOMATION_EXECUTION_ID: executionId,
          AUTOMATION_REDIS_KEY: redisKey,
        };

        // If credential_id is specified, load credentials from passwords table
        if (taskConfig.credential_id) {
          try {
            const credential = db
              .prepare('SELECT * FROM passwords WHERE id = ? AND user_id = ?')
              .get(taskConfig.credential_id, task.user_id) as Password | undefined;

            if (credential) {
              const decryptedPassword = decryptPassword(credential.password);

              // Set credentials based on app_name or type
              const appName = credential.app_name.toLowerCase();

              if (appName.includes('jira')) {
                // Jira credentials
                envVars.JIRA_URL = credential.url || '';
                envVars.JIRA_EMAIL = credential.email || credential.username || '';
                envVars.JIRA_API_TOKEN = decryptedPassword;
                if (credential.username) {
                  envVars.JIRA_USERNAME = credential.username;
                }
              } else {
                // Generic credentials - set common env vars
                if (credential.url) envVars[`${appName.toUpperCase()}_URL`] = credential.url;
                if (credential.email) envVars[`${appName.toUpperCase()}_EMAIL`] = credential.email;
                if (credential.username) envVars[`${appName.toUpperCase()}_USERNAME`] = credential.username;
                envVars[`${appName.toUpperCase()}_PASSWORD`] = decryptedPassword;
                envVars[`${appName.toUpperCase()}_API_TOKEN`] = decryptedPassword; // Also set as API_TOKEN for API keys
              }

              if (SHOW_LOGS) {
                console.log(`[Automation Worker] Loaded credentials for ${credential.app_name} (ID: ${credential.id})`);
              }
            } else if (SHOW_LOGS) {
              console.warn(`[Automation Worker] Credential ID ${taskConfig.credential_id} not found for user ${task.user_id}`);
            }
          } catch (credError) {
            if (SHOW_LOGS) {
              console.error(`[Automation Worker] Error loading credentials:`, credError);
            }
          }
        }

        // Execute script and stream output in real-time
        // Pass execution ID and credentials via environment variables
        const scriptProcess = spawn('node', [fullPath], {
          cwd: process.cwd(),
          stdio: ['inherit', 'pipe', 'pipe'], // stdin: inherit, stdout/stderr: pipe
          env: envVars,
        });

        let stdout = '';
        let stderr = '';
        const stdoutLines: string[] = [];
        const stderrLines: string[] = [];

        // Stream stdout to console in real-time (only if logs enabled)
        scriptProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          stdout += output;
          const lines = output.split('\n');
          stdoutLines.push(...lines);

          // Log each line as it comes (only if logs enabled)
          if (SHOW_LOGS) {
            lines.forEach((line: string) => {
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
          const lines = output.split('\n');
          stderrLines.push(...lines);

          // Log each line as it comes (only if logs enabled)
          if (SHOW_LOGS) {
            lines.forEach((line: string) => {
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

        // Try to get result from Redis first (preferred method)
        // Retry a few times with small delay in case script is still writing
        let scriptResponse: ScriptResponse | null = null;
        const maxRetries = 5;
        const retryDelay = 200; // 200ms between retries

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const redisResult = await redis.get(redisKey);
            if (redisResult) {
              try {
                const parsed = JSON.parse(redisResult);
                // Validate it's a script response with new format
                if (parsed.type || parsed.content !== undefined || parsed.jsonContent !== undefined) {
                  scriptResponse = {
                    success: parsed.success !== undefined ? parsed.success : true,
                    type: parsed.type || 'text',
                    content: parsed.content,
                    jsonContent: parsed.jsonContent,
                    error: parsed.error,
                    timestamp: parsed.timestamp || new Date().toISOString(),
                    skipWebhook: parsed.skipWebhook || false,
                  };
                } else {
                  // Old format, convert to new format
                  scriptResponse = {
                    success: parsed.success !== undefined ? parsed.success : true,
                    type: 'json',
                    content: JSON.stringify(parsed, null, 2),
                    jsonContent: parsed,
                    error: parsed.error,
                    timestamp: new Date().toISOString(),
                    skipWebhook: parsed.skipWebhook || false,
                  };
                }

                // Delete the key after reading (cleanup)
                await redis.del(redisKey).catch(() => {
                  // Ignore cleanup errors
                });

                if (SHOW_LOGS) {
                  console.log(`[Automation Worker] Retrieved result from Redis: ${redisKey} (attempt ${attempt + 1})`);
                }
                break; // Success, exit retry loop
              } catch (parseError) {
                if (SHOW_LOGS) {
                  console.warn(`[Automation Worker] Failed to parse Redis result:`, parseError);
                }
                break; // Parse error, don't retry
              }
            } else if (attempt < maxRetries - 1) {
              // No result yet, wait and retry
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          } catch (redisError) {
            if (SHOW_LOGS && attempt === 0) {
              console.warn(`[Automation Worker] Failed to read from Redis, will fallback to stdout:`, redisError);
            }
            break; // Redis error, don't retry
          }
        }

        if (!scriptResponse && SHOW_LOGS) {
          console.log(`[Automation Worker] No result found in Redis after ${maxRetries} attempts, falling back to stdout`);
        }

        // Fallback to stdout parsing if Redis didn't have the result
        if (!scriptResponse) {
          const parsedOutput = stdout.trim();

          // Try to find JSON in stdout (usually the last valid JSON line)
          const jsonLines = stdoutLines
            .map(line => line.trim())
            .filter(line => line && (line.startsWith('{') || line.startsWith('[')));

          if (jsonLines.length > 0) {
            // Use the last JSON line (should be the script's response)
            try {
              const parsed = JSON.parse(jsonLines[jsonLines.length - 1]);
              // Validate it's a script response with new format
              if (parsed.type || parsed.content !== undefined || parsed.jsonContent !== undefined) {
                scriptResponse = {
                  success: parsed.success !== undefined ? parsed.success : true,
                  type: parsed.type || 'text',
                  content: parsed.content,
                  jsonContent: parsed.jsonContent,
                  error: parsed.error,
                  timestamp: parsed.timestamp || new Date().toISOString(),
                  skipWebhook: parsed.skipWebhook || false,
                };
              } else {
                // Old format, convert to new format
                scriptResponse = {
                  success: parsed.success !== undefined ? parsed.success : true,
                  type: 'json',
                  content: JSON.stringify(parsed, null, 2),
                  jsonContent: parsed,
                  error: parsed.error,
                  timestamp: new Date().toISOString(),
                  skipWebhook: parsed.skipWebhook || false,
                };
              }
            } catch {
              // If last line is not valid JSON, try parsing the whole stdout
              try {
                const parsed = JSON.parse(parsedOutput);
                if (parsed.type || parsed.content !== undefined || parsed.jsonContent !== undefined) {
                  scriptResponse = {
                    success: parsed.success !== undefined ? parsed.success : true,
                    type: parsed.type || 'text',
                    content: parsed.content,
                    jsonContent: parsed.jsonContent,
                    error: parsed.error,
                    timestamp: parsed.timestamp || new Date().toISOString(),
                    skipWebhook: parsed.skipWebhook || false,
                  };
                } else {
                  scriptResponse = {
                    success: parsed.success !== undefined ? parsed.success : true,
                    type: 'json',
                    content: JSON.stringify(parsed, null, 2),
                    jsonContent: parsed,
                    error: parsed.error,
                    timestamp: new Date().toISOString(),
                    skipWebhook: parsed.skipWebhook || false,
                  };
                }
              } catch {
                // Not JSON, use raw output
              }
            }
          } else {
            // Try parsing entire stdout as JSON
            try {
              const parsed = JSON.parse(parsedOutput);
              if (parsed.type || parsed.content !== undefined || parsed.jsonContent !== undefined) {
                scriptResponse = {
                  success: parsed.success !== undefined ? parsed.success : true,
                  type: parsed.type || 'text',
                  content: parsed.content,
                  jsonContent: parsed.jsonContent,
                  error: parsed.error,
                  timestamp: parsed.timestamp || new Date().toISOString(),
                  skipWebhook: parsed.skipWebhook || false,
                };
              } else {
                scriptResponse = {
                  success: parsed.success !== undefined ? parsed.success : true,
                  type: 'json',
                  content: JSON.stringify(parsed, null, 2),
                  jsonContent: parsed,
                  error: parsed.error,
                  timestamp: new Date().toISOString(),
                  skipWebhook: parsed.skipWebhook || false,
                };
              }
            } catch {
              // Not JSON, use raw output
            }
          }
        }

        // Build result with script response
        if (scriptResponse) {
          result = {
            success: scriptResponse.success,
            output: scriptResponse.content || JSON.stringify(scriptResponse.jsonContent || {}, null, 2),
            error: scriptResponse.error,
            scriptResponse: scriptResponse,
          };
        } else {
          // Fallback to raw output
          result = {
            success: true,
            output: stdout || 'Script completed with no output',
            error: stderr || undefined,
          };
        }
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
    // Skip webhook if script response has skipWebhook flag set to true
    if (SHOW_LOGS && task.webhook_id) {
      console.log(`[Automation Worker] Webhook check for ${task.name}: skipWebhook=${result.scriptResponse?.skipWebhook}, hasScriptResponse=${!!result.scriptResponse}`);
    }

    if (task.webhook_id && !result.scriptResponse?.skipWebhook) {
      try {
        const webhook = db
          .prepare('SELECT * FROM passwords WHERE id = ? AND type = ?')
          .get(task.webhook_id, 'webhook') as Password | undefined;

        if (webhook) {
          await sendWebhookNotification(task, result, webhook);
        }
      } catch (webhookError) {
        if (SHOW_LOGS) {
          console.error(`[Automation Worker] Error sending webhook:`, webhookError);
        }
        // Don't fail the task if webhook fails
      }
    } else if (task.webhook_id && result.scriptResponse?.skipWebhook) {
      if (SHOW_LOGS) {
        console.log(`[Automation Worker] Skipping webhook for ${task.name} - skipWebhook flag is true (no new tasks)`);
      }
    }

    // Update task after execution (only if task is still enabled)
    const now = new Date().toISOString();
    const nowDate = new Date();

    // Check if task is still enabled before scheduling next run
    const currentTask = db
      .prepare('SELECT enabled FROM automation_tasks WHERE id = ?')
      .get(task.id) as { enabled: number } | undefined;

    if (currentTask && currentTask.enabled === 1) {
      // Calculate next run from current time (when task finishes), not from when it started
      const nextRunAt = calculateNextRun(task.schedule, nowDate);
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

    const errorResult: TaskResult = {
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
 * @param schedule - Schedule string (e.g., "15s", "30s", "1h", "30m", "1d", "1w")
 * @param fromDate - Date to calculate from (defaults to now)
 */
function calculateNextRun(schedule: string, fromDate?: Date): string {
  const now = fromDate || new Date();

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
