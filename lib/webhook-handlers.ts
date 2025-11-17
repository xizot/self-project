import { AutomationTask, Password } from './types';
import { decryptPassword } from './password-encryption';

// Check if logs should be shown (default: true)
const SHOW_LOGS = process.env.AUTOMATION_SHOW_LOGS !== 'false';

export interface ScriptResponse {
  success: boolean;
  type?: 'markdown' | 'text' | 'json';
  content?: string;
  jsonContent?: any;
  error?: string;
  timestamp?: string;
  skipWebhook?: boolean; // Flag để bỏ qua webhook (ví dụ: không có task mới)
}

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  scriptResponse?: ScriptResponse;
}

/**
 * Format message for Discord webhook
 */
function formatDiscordPayload(
  task: AutomationTask,
  result: TaskResult,
  scriptResponse?: ScriptResponse
): { payload: any; headers: Record<string, string> } {
  const statusEmoji = result.success ? '✅' : '❌';
  const statusText = result.success ? 'Success' : 'Failed';
  const color = result.success ? 0x00ff00 : 0xff0000;

  const taskName =
    task.name.length > 200 ? task.name.substring(0, 197) + '...' : task.name;

  let description = `**Status:** ${statusEmoji} ${statusText}\n`;
  description += `**Run Count:** ${(task.run_count || 0) + 1}\n`;
  description += `**Timestamp:** <t:${Math.floor(new Date().getTime() / 1000)}:F>\n`;

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  // Helper function to sanitize text for Discord code blocks
  const sanitizeForCodeBlock = (
    text: string,
    maxLength: number = 900
  ): string => {
    if (!text) return '';
    let sanitized = String(text)
      .replace(/\u0000/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u200B/g, '');
    const actualMaxLength = Math.min(maxLength, maxLength - 10);
    if (sanitized.length > actualMaxLength) {
      sanitized = sanitized.substring(0, actualMaxLength - 3) + '...';
    }
    return sanitized;
  };

  const formatFieldValue = (
    content: string,
    maxLength: number = 900
  ): string => {
    const sanitized = sanitizeForCodeBlock(content, maxLength);
    const codeBlock = `\`\`\`text\n${sanitized}\`\`\``;
    if (codeBlock.length > 1024) {
      const adjustedLength = 1024 - 10;
      const truncated = sanitizeForCodeBlock(content, adjustedLength);
      return `\`\`\`text\n${truncated}\`\`\``;
    }
    return codeBlock;
  };

  // Use script response if available
  // Output removed - markdown doesn't work in webhooks
  if (scriptResponse) {
    // Output content removed
  } else if (result.output) {
    // Output content removed
  }

  // Add error if exists
  if (result.error || scriptResponse?.error) {
    const errorText = result.error || scriptResponse?.error || '';
    try {
      const fieldValue = formatFieldValue(errorText, 900);
      fields.push({
        name: '❌ Error',
        value: fieldValue,
        inline: false,
      });
    } catch {
      fields.push({
        name: '❌ Error',
        value: '```\n(Error message too large or invalid)\n```',
        inline: false,
      });
    }
  }

  const embed: any = {
    title: `Automation Task: ${taskName}`,
    description: description,
    color: color,
    timestamp: new Date().toISOString(),
    footer: {
      text: `Task ID: ${task.id}`,
    },
  };

  if (fields.length > 0) {
    embed.fields = fields;
  }

  // Validate Discord limits
  if (embed.title && embed.title.length > 256) {
    embed.title = embed.title.substring(0, 253) + '...';
  }
  if (embed.description && embed.description.length > 4096) {
    embed.description = embed.description.substring(0, 4093) + '...';
  }
  if (embed.fields) {
    if (embed.fields.length > 25) {
      embed.fields = embed.fields.slice(0, 25);
    }
    embed.fields = embed.fields.map(
      (field: { name: string; value: string; inline?: boolean }) => {
        const validatedField = { ...field };
        if (validatedField.name.length > 256) {
          validatedField.name = validatedField.name.substring(0, 253) + '...';
        }
        if (validatedField.value.length > 1024) {
          validatedField.value =
            validatedField.value.substring(0, 1021) + '...';
        }
        return validatedField;
      }
    );
  }

  return {
    payload: { embeds: [embed] },
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Format message for Webex Incoming Webhook
 */
function formatWebexIncomingPayload(
  task: AutomationTask,
  result: TaskResult,
  scriptResponse?: ScriptResponse
): { payload: any; headers: Record<string, string> } {
  const statusEmoji = result.success ? '✅' : '❌';
  const statusText = result.success ? 'Success' : 'Failed';

  let messageMarkdown = `## Automation Task: ${task.name}\n\n`;
  messageMarkdown += `**Status:** ${statusEmoji} ${statusText}\n`;
  messageMarkdown += `**Timestamp:** ${new Date().toLocaleString('vi-VN')}\n`;
  messageMarkdown += `**Task ID:** ${task.id}\n\n`;

  // Use script response if available
  if (scriptResponse) {
    if (scriptResponse.content) {
      let content = scriptResponse.content;
      if (scriptResponse.type === 'json' && scriptResponse.jsonContent) {
        content = JSON.stringify(scriptResponse.jsonContent, null, 2);
      }
      if (content.length > 3000) {
        content = content.substring(0, 2997) + '...';
      }

      messageMarkdown += content;
    }
  } else if (result.output) {
    // Fallback to old format
    try {
      let outputText = result.output;
      try {
        const parsed = JSON.parse(result.output);
        outputText = JSON.stringify(parsed, null, 2);
      } catch {
        // Not JSON, use as-is
      }
      if (outputText.length > 3000) {
        outputText = outputText.substring(0, 2997) + '...';
      }

      messageMarkdown += outputText;
    } catch {
      messageMarkdown += result.output;
    }
  }

  // Add error if exists
  if (result.error || scriptResponse?.error) {
    const errorText = result.error || scriptResponse?.error || '';
    if (errorText.length > 2000) {
      const truncated = errorText.substring(0, 1997) + '...';
      messageMarkdown += `**❌ Error:**\n\`\`\`\n${truncated}\n\`\`\`\n`;
    } else {
      messageMarkdown += `**❌ Error:**\n\`\`\`\n${errorText}\n\`\`\`\n`;
    }
  }

  return {
    payload: { markdown: messageMarkdown },
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Format message for Webex API
 */
function formatWebexApiPayload(
  task: AutomationTask,
  result: TaskResult,
  webhook: Password,
  webhookUrl: string,
  scriptResponse?: ScriptResponse
): { payload: any; headers: Record<string, string>; finalUrl?: string } {
  let messageText = `**Timestamp:** ${new Date().toLocaleString('vi-VN')}\n`;
  messageText += `**Task ID:** ${task.id}\n\n`;

  // Use script response if available
  if (scriptResponse) {
    if (scriptResponse.content) {
      let content = scriptResponse.content;
      if (scriptResponse.type === 'json' && scriptResponse.jsonContent) {
        content = JSON.stringify(scriptResponse.jsonContent, null, 2);
      }
      if (content.length > 3000) {
        content = content.substring(0, 2997) + '...';
      }
      // Output removed - markdown doesn't work in webhooks
    }
  } else if (result.output) {
    // Fallback to old format
    try {
      let outputText = result.output;
      try {
        const parsed = JSON.parse(result.output);
        outputText = JSON.stringify(parsed, null, 2);
      } catch {
        // Not JSON, use as-is
      }
      if (outputText.length > 3000) {
        outputText = outputText.substring(0, 2997) + '...';
      }
      // Output removed - markdown doesn't work in webhooks
    } catch {
      // Output removed - markdown doesn't work in webhooks
    }
  }

  // Add error if exists
  if (result.error || scriptResponse?.error) {
    const errorText = result.error || scriptResponse?.error || '';
    if (errorText.length > 2000) {
      const truncated = errorText.substring(0, 1997) + '...';
      messageText += `**❌ Error:**\n\`\`\`\n${truncated}\n\`\`\`\n`;
    } else {
      messageText += `**❌ Error:**\n\`\`\`\n${errorText}\n\`\`\`\n`;
    }
  }

  const payload: any = { text: messageText };

  // Extract token and roomId
  let webexToken = webhook.username || '';
  if (!webexToken && webhook.notes) {
    try {
      const notesConfig = JSON.parse(webhook.notes);
      webexToken = notesConfig.token || notesConfig.accessToken || '';
    } catch {
      // Notes is not JSON, ignore
    }
  }

  let roomId = '';
  let toPersonEmail = '';

  if (webhook.notes) {
    try {
      const notesConfig = JSON.parse(webhook.notes);
      if (notesConfig.roomId) roomId = notesConfig.roomId;
      if (notesConfig.toPersonEmail) toPersonEmail = notesConfig.toPersonEmail;
      if (notesConfig.email) toPersonEmail = notesConfig.email;
      if (notesConfig.room_id) roomId = notesConfig.room_id;
    } catch {
      // Notes is not JSON, ignore
    }
  }

  if (!roomId && !toPersonEmail) {
    if (webhook.url && !webhook.url.includes('http')) {
      if (webhook.url.includes('@')) {
        toPersonEmail = webhook.url;
      } else {
        roomId = webhook.url;
      }
    } else if (webhook.url && webhook.url.includes('@')) {
      toPersonEmail = webhook.url;
    }
  }

  if (roomId) {
    payload.roomId = roomId;
  } else if (toPersonEmail) {
    payload.toPersonEmail = toPersonEmail;
  } else {
    throw new Error(
      'Webex API webhook requires either roomId or toPersonEmail'
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (webexToken) {
    headers['Authorization'] = `Bearer ${webexToken}`;
  } else {
    const urlMatch = webhookUrl.match(/[?&]token=([^&]+)/);
    if (urlMatch) {
      headers['Authorization'] = `Bearer ${urlMatch[1]}`;
    } else if (SHOW_LOGS) {
      console.warn(`[Webhook Handler] Webex API webhook missing token`);
    }
  }

  let finalUrl = webhookUrl;
  if (
    webhookUrl.includes('webexapis.com') &&
    !webhookUrl.includes('/v1/messages')
  ) {
    const baseUrl = webhookUrl.split('?')[0];
    const queryParams = webhookUrl.includes('?')
      ? webhookUrl.split('?')[1]
      : '';
    finalUrl = `${baseUrl.replace(/\/$/, '')}/v1/messages${queryParams ? '?' + queryParams : ''}`;
  }

  return { payload, headers, finalUrl };
}

/**
 * Format message for generic webhook
 */
function formatGenericPayload(
  task: AutomationTask,
  result: TaskResult,
  scriptResponse?: ScriptResponse
): { payload: any; headers: Record<string, string> } {
  const payload: any = {
    task_id: task.id,
    task_name: task.name,
    success: result.success,
    timestamp: new Date().toISOString(),
    run_count: (task.run_count || 0) + 1,
  };

  // Use script response if available
  if (scriptResponse) {
    payload.type = scriptResponse.type || 'text';
    payload.content = scriptResponse.content;
    if (scriptResponse.jsonContent) {
      payload.jsonContent = scriptResponse.jsonContent;
    }
    if (scriptResponse.error) {
      payload.error = scriptResponse.error;
    }
  } else {
    // Fallback to old format
    payload.output = result.output;
    if (result.error) {
      payload.error = result.error;
    }
  }

  return {
    payload,
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Send webhook notification
 */
export async function sendWebhookNotification(
  task: AutomationTask,
  result: TaskResult,
  webhook: Password
): Promise<void> {
  try {
    const webhookUrl = decryptPassword(webhook.password);

    const isDiscordWebhook =
      webhookUrl.includes('discord.com/api/webhooks') ||
      webhookUrl.includes('discordapp.com/api/webhooks');

    const isWebexWebhook =
      webhookUrl.includes('webexapis.com') ||
      webhookUrl.includes('webex.com') ||
      webhook.app_name.toLowerCase().includes('webex');

    const isWebexIncomingWebhook = webhookUrl.includes('/webhooks/incoming/');

    let formatted: {
      payload: any;
      headers: Record<string, string>;
      finalUrl?: string;
    };

    if (isDiscordWebhook) {
      formatted = formatDiscordPayload(task, result, result.scriptResponse);
    } else if (isWebexIncomingWebhook) {
      formatted = formatWebexIncomingPayload(
        task,
        result,
        result.scriptResponse
      );
    } else if (isWebexWebhook) {
      formatted = formatWebexApiPayload(
        task,
        result,
        webhook,
        webhookUrl,
        result.scriptResponse
      );
    } else {
      formatted = formatGenericPayload(task, result, result.scriptResponse);
    }

    const urlToUse = formatted.finalUrl || webhookUrl;
    const payloadJson = JSON.stringify(formatted.payload);

    if (SHOW_LOGS) {
      if (isWebexWebhook || isWebexIncomingWebhook) {
        console.log(`[Webhook Handler] Webex request details:`);
        console.log(
          `  Type: ${isWebexIncomingWebhook ? 'Incoming Webhook' : 'API'}`
        );
        console.log(`  URL: ${urlToUse.substring(0, 100)}...`);
      }
    }

    const response = await fetch(urlToUse, {
      method: 'POST',
      headers: formatted.headers,
      body: payloadJson,
    });

    if (SHOW_LOGS) {
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(
          `[Webhook Handler] Webhook returned ${response.status} for ${webhook.app_name}`
        );
        if (errorText) {
          console.warn(
            `[Webhook Handler] Error response: ${errorText.substring(0, 500)}`
          );
        }

        if (
          (isWebexWebhook || isWebexIncomingWebhook) &&
          response.status === 404
        ) {
          if (isWebexIncomingWebhook) {
            console.error(
              `[Webhook Handler] Webex Incoming Webhook 404 - URL may be incorrect or expired`
            );
          } else {
            console.error(
              `[Webhook Handler] Webex API 404 - Room ID may be incorrect or bot lacks access`
            );
          }
        }
      } else {
        console.log(
          `[Webhook Handler] Sent result to webhook: ${webhook.app_name}`
        );
      }
    }
  } catch (error) {
    if (SHOW_LOGS) {
      console.error(`[Webhook Handler] Error sending webhook:`, error);
    }
    // Don't throw - webhook failure shouldn't fail the task
  }
}
