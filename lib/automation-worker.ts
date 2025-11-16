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

        // Try to parse JSON response from stdout
        // Scripts should output JSON as the last line of stdout
        let scriptResponse: any = null;
        const parsedOutput = stdout.trim();

        // Try to find JSON in stdout (usually the last valid JSON line)
        const jsonLines = stdoutLines
          .map(line => line.trim())
          .filter(line => line && (line.startsWith('{') || line.startsWith('[')));

        if (jsonLines.length > 0) {
          // Use the last JSON line (should be the script's response)
          try {
            scriptResponse = JSON.parse(jsonLines[jsonLines.length - 1]);
          } catch {
            // If last line is not valid JSON, try parsing the whole stdout
            try {
              scriptResponse = JSON.parse(parsedOutput);
            } catch {
              // Not JSON, use raw output
            }
          }
        } else {
          // Try parsing entire stdout as JSON
          try {
            scriptResponse = JSON.parse(parsedOutput);
          } catch {
            // Not JSON, use raw output
          }
        }

        // Use script response if available, otherwise use raw output
        if (scriptResponse) {
          result = {
            success: scriptResponse.success !== undefined ? scriptResponse.success : true,
            output: JSON.stringify(scriptResponse, null, 2),
            error: scriptResponse.error || (scriptResponse.success === false ? scriptResponse.error || 'Script returned error' : undefined),
          };
        } else {
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
    if (task.webhook_id) {
      try {
        const webhook = db
          .prepare('SELECT * FROM passwords WHERE id = ? AND type = ?')
          .get(task.webhook_id, 'webhook') as Password | undefined;

        if (webhook) {
          const webhookUrl = decryptPassword(webhook.password);

          // Check if this is a Discord webhook
          const isDiscordWebhook = webhookUrl.includes('discord.com/api/webhooks') ||
                                   webhookUrl.includes('discordapp.com/api/webhooks');

          let payload: any;

          if (isDiscordWebhook) {
            // Format payload for Discord webhook
            // Discord limits: title max 256 chars, description max 4096 chars, field value max 1024 chars
            const statusEmoji = result.success ? '✅' : '❌';
            const statusText = result.success ? 'Success' : 'Failed';
            const color = result.success ? 0x00ff00 : 0xff0000; // Green for success, red for failure

            // Truncate task name if too long (max 200 chars for title)
            const taskName = task.name.length > 200 ? task.name.substring(0, 197) + '...' : task.name;

            // Build base description (keep it short)
            let description = `**Status:** ${statusEmoji} ${statusText}\n`;
            description += `**Run Count:** ${(task.run_count || 0) + 1}\n`;
            description += `**Timestamp:** <t:${Math.floor(new Date().getTime() / 1000)}:F>\n`;

            // Build fields array for better organization
            const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

            // Helper function to sanitize text for Discord code blocks
            const sanitizeForCodeBlock = (text: string, maxLength: number = 900): string => {
              if (!text) return '';

              // Remove or replace problematic characters
              let sanitized = String(text)
                .replace(/\u0000/g, '') // Remove null bytes
                .replace(/\r\n/g, '\n') // Normalize line endings
                .replace(/\r/g, '\n')
                .replace(/\u200B/g, ''); // Remove zero-width spaces

              // Truncate if too long (reserve space for code block markers)
              // Discord field value limit is 1024, code block adds ~10 chars
              const actualMaxLength = Math.min(maxLength, maxLength - 10);
              if (sanitized.length > actualMaxLength) {
                sanitized = sanitized.substring(0, actualMaxLength - 3) + '...';
              }

              return sanitized;
            };

            // Helper function to format field value with code block
            const formatFieldValue = (content: string, maxLength: number = 900): string => {
              const sanitized = sanitizeForCodeBlock(content, maxLength);
              // Discord field value max is 1024, code block format: ```text\n...\n``` = ~10 chars
              const codeBlock = `\`\`\`text\n${sanitized}\`\`\``;

              // Final check - ensure total length doesn't exceed 1024
              if (codeBlock.length > 1024) {
                const adjustedLength = 1024 - 10; // Reserve for code block markers
                const truncated = sanitizeForCodeBlock(content, adjustedLength);
                return `\`\`\`text\n${truncated}\`\`\``;
              }

              return codeBlock;
            };

            // Add output as a field if exists (max 1024 chars per field value)
            if (result.output) {
              try {
                // Try to parse as JSON and format it nicely if possible
                let outputText = result.output;
                try {
                  const parsed = JSON.parse(result.output);
                  outputText = JSON.stringify(parsed, null, 2);
                } catch {
                  // Not JSON, use as-is
                }

                const fieldValue = formatFieldValue(outputText, 900);
                fields.push({
                  name: '📤 Output',
                  value: fieldValue,
                  inline: false
                });
              } catch (err) {
                if (SHOW_LOGS) {
                  console.warn(`[Automation Worker] Error formatting output field:`, err);
                }
                // Fallback: just add a simple message
                fields.push({
                  name: '📤 Output',
                  value: '```\n(Output too large or invalid)\n```',
                  inline: false
                });
              }
            }

            // Add error as a field if exists
            if (result.error) {
              try {
                const fieldValue = formatFieldValue(result.error, 900);
                fields.push({
                  name: '❌ Error',
                  value: fieldValue,
                  inline: false
                });
              } catch (err) {
                if (SHOW_LOGS) {
                  console.warn(`[Automation Worker] Error formatting error field:`, err);
                }
                fields.push({
                  name: '❌ Error',
                  value: '```\n(Error message too large or invalid)\n```',
                  inline: false
                });
              }
            }

            // Build embed object
            const embed: any = {
              title: `Automation Task: ${taskName}`,
              description: description,
              color: color,
              timestamp: new Date().toISOString(),
              footer: {
                text: `Task ID: ${task.id}`
              }
            };

            // Add fields if any
            if (fields.length > 0) {
              embed.fields = fields;
            }

            payload = {
              embeds: [embed]
            };

            // Final validation: ensure all Discord limits are respected
            // Discord limits:
            // - Title: 256 chars
            // - Description: 4096 chars
            // - Field name: 256 chars
            // - Field value: 1024 chars
            // - Total fields: 25
            // - Total embed: 6000 chars

            // Validate title
            if (embed.title && embed.title.length > 256) {
              embed.title = embed.title.substring(0, 253) + '...';
            }

            // Validate description
            if (embed.description && embed.description.length > 4096) {
              embed.description = embed.description.substring(0, 4093) + '...';
            }

            // Validate fields
            if (embed.fields) {
              // Limit to 25 fields
              if (embed.fields.length > 25) {
                embed.fields = embed.fields.slice(0, 25);
              }

              // Validate each field
              embed.fields = embed.fields.map((field: { name: string; value: string; inline?: boolean }) => {
                const validatedField = { ...field };

                // Validate field name
                if (validatedField.name.length > 256) {
                  validatedField.name = validatedField.name.substring(0, 253) + '...';
                }

                // Validate field value
                if (validatedField.value.length > 1024) {
                  validatedField.value = validatedField.value.substring(0, 1021) + '...';
                }

                return validatedField;
              });
            }

            // Rebuild payload with validated embed
            payload = { embeds: [embed] };

            // Final check: validate JSON can be stringified
            try {
              const testJson = JSON.stringify(payload);
              if (testJson.length > 20000) {
                if (SHOW_LOGS) {
                  console.warn(`[Automation Worker] Discord payload too large (${testJson.length} chars), simplifying...`);
                }
                // Simplify by reducing fields
                if (embed.fields && embed.fields.length > 1) {
                  embed.fields = embed.fields.slice(0, 1);
                  // Truncate field value if too long
                  if (embed.fields[0].value.length > 1024) {
                    // Extract content from code block, truncate, and re-format
                    let fieldContent = embed.fields[0].value
                      .replace(/```text\n/g, '')
                      .replace(/```/g, '')
                      .trim();
                    // Truncate to 800 chars
                    if (fieldContent.length > 800) {
                      fieldContent = fieldContent.substring(0, 797) + '...';
                    }
                    embed.fields[0].value = `\`\`\`text\n${fieldContent}\`\`\``;
                  }
                }
                payload = { embeds: [embed] };
              }
            } catch (jsonError) {
              if (SHOW_LOGS) {
                console.error(`[Automation Worker] Error validating payload JSON:`, jsonError);
              }
              // Fallback: create minimal payload
              payload = {
                embeds: [{
                  title: `Automation Task: ${taskName.substring(0, 200)}`,
                  description: `**Status:** ${statusEmoji} ${statusText}\n**Run Count:** ${(task.run_count || 0) + 1}`,
                  color: color,
                  timestamp: new Date().toISOString(),
                }]
              };
            }
          } else {
            // Generic webhook format for other services
            payload = {
              task_id: task.id,
              task_name: task.name,
              success: result.success,
              output: result.output,
              error: result.error,
              timestamp: new Date().toISOString(),
              run_count: (task.run_count || 0) + 1,
            };
          }

          // Validate payload before sending
          let payloadJson: string;
          try {
            payloadJson = JSON.stringify(payload);
            // Check for invalid characters that might cause issues
            if (payloadJson.includes('\u0000')) {
              if (SHOW_LOGS) {
                console.warn(`[Automation Worker] Payload contains null bytes, cleaning...`);
              }
              payloadJson = payloadJson.replace(/\u0000/g, '');
            }
          } catch (jsonError) {
            if (SHOW_LOGS) {
              console.error(`[Automation Worker] Error stringifying webhook payload:`, jsonError);
            }
            throw new Error('Failed to serialize webhook payload');
          }

          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: payloadJson,
          });

          if (SHOW_LOGS) {
            if (!webhookResponse.ok) {
              const errorText = await webhookResponse.text().catch(() => '');
              console.warn(`[Automation Worker] Webhook returned ${webhookResponse.status} for ${webhook.app_name}`);
              if (errorText) {
                console.warn(`[Automation Worker] Webhook error response: ${errorText.substring(0, 500)}`);
              }
              // Log payload info for debugging
              if (webhookResponse.status === 400) {
                console.warn(`[Automation Worker] Payload size: ${payloadJson.length} chars`);
                console.warn(`[Automation Worker] Payload preview: ${payloadJson.substring(0, 200)}...`);
              }
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

