/* eslint-disable @typescript-eslint/no-require-imports */
const { saveResult } = require('./redis-service');
const Redis = require('ioredis');

/**
 * Script để lấy các task được assign cho user trên Jira
 *
 * Sử dụng Jira REST API v3 với Basic Authentication (email:api_token)
 * Endpoint: /rest/api/3/search/jql (endpoint mới, thay thế /rest/api/3/search từ tháng 5/2025)
 * Migration guide: https://developer.atlassian.com/changelog/#CHANGE-2046
 *
 * Credentials sẽ được lấy từ hệ thống quản lý mật khẩu (passwords table)
 * thông qua credential_id trong config của automation task.
 *
 * Automation worker sẽ tự động load credentials và set vào environment variables:
 * - JIRA_URL: URL của Jira instance (từ password.url, ví dụ: https://your-domain.atlassian.net)
 * - JIRA_EMAIL: Email Atlassian của bạn (từ password.email hoặc password.username)
 * - JIRA_API_TOKEN: API token của Jira (từ password.password - đã decrypt)
 *
 * Cách tạo API Token:
 * 1. Truy cập: https://id.atlassian.com/manage-profile/security/api-tokens
 * 2. Click "Create API token"
 * 3. Nhập mô tả và tạo token
 * 4. Copy token và lưu vào password record (field password)
 *
 * Config trong automation task:
 * {
 *   "path": "scripts/get-jira-tasks.js",
 *   "credential_id": 123  // ID của password record trong passwords table
 * }
 *
 * Password record cần có:
 * - app_name: "Jira" (hoặc chứa "jira")
 * - url: URL Jira instance (ví dụ: https://your-domain.atlassian.net)
 * - email: Email Atlassian của bạn
 * - password: API token (từ Atlassian account, không phải mật khẩu)
 * - type: "api_key" hoặc "token"
 *
 * Hoặc có thể override bằng environment variables (fallback):
 * - JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN
 */
// Helper function để lấy Redis client
const getRedisClient = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
};

// Helper function để kiểm tra task đã được gửi trong 30 phút chưa
async function checkTaskSentRecently(taskKey) {
  const redis = getRedisClient();
  try {
    await redis.connect();
    const key = `jira:task:sent:${taskKey}`;
    const exists = await redis.exists(key);
    await redis.quit();
    return exists === 1;
  } catch (error) {
    console.error('Error checking task sent status:', error.message);
    // Nếu Redis lỗi, cho phép gửi (fail open)
    return false;
  }
}

// Helper function để đánh dấu task đã được gửi (TTL 30 phút = 1800 giây)
async function markTaskAsSent(taskKey) {
  const redis = getRedisClient();
  try {
    await redis.connect();
    const key = `jira:task:sent:${taskKey}`;
    await redis.setex(key, 1800, '1'); // 30 phút = 1800 giây
    await redis.quit();
  } catch (error) {
    console.error('Error marking task as sent:', error.message);
    // Ignore error, không block việc gửi
  }
}

async function getJiraTasks() {
  try {
    // Lấy credentials từ environment variables (được set bởi automation worker từ passwords table)
    let jiraUrl = process.env.JIRA_URL;
    let email = process.env.JIRA_EMAIL;
    let apiToken = process.env.JIRA_API_TOKEN || process.env.JIRA_PASSWORD;

    // Validate required fields
    if (!jiraUrl) {
      throw new Error('JIRA_URL không được tìm thấy. Hãy đảm bảo credential_id trong config trỏ đến password record có url, hoặc app_name chứa "jira"');
    }
    if (!apiToken) {
      throw new Error('JIRA_API_TOKEN không được tìm thấy. Hãy đảm bảo password record có password field chứa API token từ https://id.atlassian.com/manage-profile/security/api-tokens');
    }
    if (!email) {
      throw new Error('JIRA_EMAIL không được tìm thấy. Hãy đảm bảo password record có email hoặc username (email Atlassian của bạn)');
    }

    // Đảm bảo JIRA_URL không có trailing slash
    jiraUrl = jiraUrl.replace(/\/$/, '');

    // Jira API sử dụng Basic Auth với format: email:api_token
    // API token được tạo tại: https://id.atlassian.com/manage-profile/security/api-tokens
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // JQL query để lấy tasks assigned to current user
    // Loại bỏ các task có status "Done" và "Cancel"
    // Có thể customize qua JIRA_JQL environment variable
    const jql = process.env.JIRA_JQL || `assignee = currentUser() AND status != Done AND status != Cancel ORDER BY updated DESC`;

    console.error(`Đang lấy tasks từ Jira: ${jiraUrl}`);
    console.error(`JQL: ${jql}`);

    // Gọi Jira REST API v3 - sử dụng endpoint mới /rest/api/3/search/jql
    // Endpoint cũ /rest/api/3/search đã bị loại bỏ từ tháng 5/2025
    // Migration guide: https://developer.atlassian.com/changelog/#CHANGE-2046
    // API mới có thể yêu cầu format khác, thử với format đơn giản nhất trước
    const apiUrl = `${jiraUrl}/rest/api/3/search/jql`;

    // Format request body cho API mới
    // API mới có thể không chấp nhận startAt, thử bỏ nó đi
    const requestBody = {
      jql: jql,
      fields: ['summary', 'status', 'priority', 'assignee', 'created', 'updated', 'issuetype', 'project'],
      maxResults: 50,
    };

    console.error('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Jira API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errorMessages && errorJson.errorMessages.length > 0) {
          errorMessage = errorJson.errorMessages.join(', ');
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        errorMessage += ` - ${errorText.substring(0, 200)}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    console.error('Response data keys:', Object.keys(data));
    console.error('Response issues count:', data.issues?.length || 0);

    // API mới /rest/api/3/search/jql có thể không trả về 'total' field
    // Nếu không có, sử dụng số lượng issues trả về hoặc ước tính
    const totalCount = data.total !== undefined ? data.total : (data.issues?.length || 0);

    // Format dữ liệu
    const allTasks = (data.issues || []).map(issue => {
      const fields = issue.fields || {};
      return {
        key: issue.key,
        summary: fields.summary || 'No summary',
        status: fields.status?.name || 'Unknown',
        priority: fields.priority?.name || 'None',
        assignee: fields.assignee ? {
          displayName: fields.assignee.displayName,
          emailAddress: fields.assignee.emailAddress,
          accountId: fields.assignee.accountId,
        } : null,
        issueType: fields.issuetype?.name || 'Unknown',
        project: fields.project ? {
          key: fields.project.key,
          name: fields.project.name,
        } : null,
        created: fields.created,
        updated: fields.updated,
        url: `${jiraUrl}/browse/${issue.key}`,
      };
    });

    // Lọc các task chưa được gửi trong 30 phút
    const newTasks = [];
    const existingTasks = [];

    for (const task of allTasks) {
      const wasSent = await checkTaskSentRecently(task.key);
      if (!wasSent) {
        newTasks.push(task);
        // Đánh dấu task đã được gửi (TTL 30 phút)
        await markTaskAsSent(task.key);
      } else {
        existingTasks.push(task);
      }
    }

    // Chỉ hiển thị các task mới (chưa được gửi trong 30 phút)
    const tasks = newTasks;

    // Helper function để format status với icon và màu
    const formatStatus = (status) => {
      const statusLower = status.toLowerCase();

      if (statusLower.includes('to do') || statusLower.includes('todo') || statusLower === 'to do') {
        return `📋 **${status}**`;
      } else if (statusLower.includes('in progress') || statusLower.includes('inprogress') || statusLower === 'in progress') {
        return `🔄 **${status}**`;
      } else if (statusLower.includes('done') || statusLower.includes('completed')) {
        return `✅ **${status}**`;
      } else if (statusLower.includes('cancel') || statusLower.includes('cancelled')) {
        return `❌ **${status}**`;
      } else if (statusLower.includes('block') || statusLower.includes('blocked')) {
        return `🚫 **${status}**`;
      } else if (statusLower.includes('review') || statusLower.includes('reviewing')) {
        return `👀 **${status}**`;
      } else {
        return `📌 **${status}**`;
      }
    };

    // Tạo markdown content
    let markdownContent = `### Jira Tasks Assigned to Me\n\n`;
    if (data.total !== undefined) {
      markdownContent += `**Tổng số:** ${data.total} task(s)\n`;
    }
    markdownContent += `**Task mới:** ${tasks.length} task(s)\n`;
    if (existingTasks.length > 0) {
      markdownContent += `**Task đã gửi (trong 30 phút):** ${existingTasks.length} task(s)\n`;
    }
    markdownContent += `\n`;

    if (tasks.length === 0) {
      if (existingTasks.length > 0) {
        markdownContent += `Tất cả task đã được gửi trong 30 phút gần đây. Không có task mới.\n`;
      } else {
        markdownContent += `Không có task nào được assign cho bạn.\n`;
      }
    } else {
      markdownContent += `### Danh sách Tasks: \n\n`;

      tasks.forEach((task, index) => {
        markdownContent += `### ${index + 1}. [${task.key}](${task.url}) ${task.summary}\n\n`;
        markdownContent += `- **Status:** ${formatStatus(task.status)}\n`;
        markdownContent += `- **Priority:** ${task.priority}\n`;
        markdownContent += `- **Type:** ${task.issueType}\n`;
        if (task.project) {
          markdownContent += `- **Project:** ${task.project.name} (${task.project.key})\n`;
        }
        if (task.assignee) {
          markdownContent += `- **Assignee:** ${task.assignee.displayName}\n`;
        }
        if (task.created) {
          const createdDate = new Date(task.created);
          markdownContent += `- **Created:** ${createdDate.toLocaleString('vi-VN')}\n`;
        }
        if (task.updated) {
          const updatedDate = new Date(task.updated);
          markdownContent += `- **Updated:** ${updatedDate.toLocaleString('vi-VN')}\n`;
        }
        markdownContent += `\n`;
      });
    }

    const result = {
      success: true,
      type: 'markdown',
      content: markdownContent,
      skipWebhook: tasks.length === 0, // Không gửi webhook nếu không có task mới
      jsonContent: {
        timestamp: new Date().toISOString(),
        source: jiraUrl,
        total: totalCount,
        startAt: data.startAt || 0,
        maxResults: data.maxResults || 50,
        tasks: tasks,
        newTasksCount: tasks.length,
        existingTasksCount: existingTasks.length,
      },
    };

    // Save result to Redis if execution ID is provided
    await saveResult(result);

    // Output JSON result to stdout (for backward compatibility and fallback)
    // Logs go to stderr so they don't interfere with JSON output
    console.error('Lấy Jira tasks thành công!');
    console.log(JSON.stringify(result));

    return result;
  } catch (error) {
    // Xử lý lỗi chi tiết hơn
    let errorMessage = error.message || String(error);
    let errorDetails = {};

    // Kiểm tra các lỗi phổ biến
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = `Lỗi xác thực Jira: ${errorMessage}. ` +
        `Hãy kiểm tra lại email Atlassian và API token. ` +
        `API token có thể tạo tại: https://id.atlassian.com/manage-profile/security/api-tokens`;
      errorDetails = {
        type: 'authentication_error',
        suggestion: 'Kiểm tra lại email và API token trong Quản lý Mật khẩu. Đảm bảo API token được tạo từ Atlassian account của bạn.',
      };
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = `Không có quyền truy cập Jira: ${errorMessage}. ` +
        `Hãy kiểm tra quyền của tài khoản.`;
      errorDetails = {
        type: 'authorization_error',
        suggestion: 'Kiểm tra quyền truy cập của tài khoản Jira',
      };
    } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      errorMessage = `Không tìm thấy Jira instance: ${errorMessage}. ` +
        `Hãy kiểm tra lại JIRA_URL.`;
      errorDetails = {
        type: 'not_found_error',
        suggestion: 'Kiểm tra lại JIRA_URL trong config',
      };
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      errorMessage = `Lỗi kết nối đến Jira: ${errorMessage}. ` +
        `Hãy kiểm tra lại JIRA_URL và kết nối mạng.`;
      errorDetails = {
        type: 'connection_error',
        suggestion: 'Kiểm tra JIRA_URL và kết nối mạng',
      };
    } else if (errorMessage.includes('timeout')) {
      errorMessage = `Timeout khi kết nối Jira: ${errorMessage}`;
      errorDetails = {
        type: 'timeout_error',
        suggestion: 'Thử lại sau hoặc kiểm tra kết nối mạng',
      };
    }

    const errorResult = {
      success: false,
      type: 'text',
      content: `Lỗi khi lấy Jira tasks: ${errorMessage}`,
      error: errorMessage,
      jsonContent: {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        ...errorDetails,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    };

    // Save error result to Redis if execution ID is provided
    await saveResult(errorResult);

    // Output JSON result to stdout even on error (for backward compatibility)
    console.error('Lỗi khi lấy Jira tasks:', errorMessage);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    console.log(JSON.stringify(errorResult));

    return errorResult;
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  getJiraTasks()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Lỗi:', error);
      process.exit(1);
    });
}

module.exports = { getJiraTasks };

