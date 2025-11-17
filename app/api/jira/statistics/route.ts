import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { Password } from '@/lib/types';
import { decryptPassword } from '@/lib/password-encryption';

interface StatisticsResponse {
  success: boolean;
  statistics?: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byAssignee: Record<string, number>;
    byType: Record<string, number>;
    total: number;
  };
  error?: string;
}

/**
 * GET Jira statistics based on credential_id
 * Query params:
 * - credential_id: ID of the Jira credential in passwords table
 * - jql: Optional JQL query (default: all issues)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const credentialId = searchParams.get('credential_id');
    // Default JQL: get all issues (use a valid query)
    // JQL cannot be just "ORDER BY", it needs at least one condition
    // Use a condition that matches all issues (updated in last year to get most issues)
    const jql = searchParams.get('jql') || 'updated >= -365d ORDER BY updated DESC';

    if (!credentialId) {
      return NextResponse.json(
        { error: 'credential_id is required' },
        { status: 400 }
      );
    }

    // Get credential from passwords table
    const credential = db
      .prepare('SELECT * FROM passwords WHERE id = ? AND user_id = ?')
      .get(parseInt(credentialId), user.id) as Password | undefined;

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Check if it's a Jira credential
    const appName = credential.app_name.toLowerCase();
    if (!appName.includes('jira')) {
      return NextResponse.json(
        { error: 'Selected credential is not a Jira credential' },
        { status: 400 }
      );
    }

    // Decrypt password (API token)
    const apiToken = decryptPassword(credential.password);
    const jiraUrl = credential.url || '';
    const email = credential.email || credential.username || '';

    if (!jiraUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Jira URL or API token is missing in credential' },
        { status: 400 }
      );
    }

    // Normalize Jira URL (remove trailing slash)
    const normalizedUrl = jiraUrl.replace(/\/$/, '');
    const apiUrl = `${normalizedUrl}/rest/api/3/search/jql`;

    // Make request to Jira API
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    // Fetch all issues (increase maxResults to get more data)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        jql: jql, // JQL query (must be valid, cannot be just ORDER BY)
        maxResults: 1000, // Get more issues for statistics
        fields: [
          'summary',
          'status',
          'priority',
          'issuetype',
          'assignee',
          'created',
          'updated',
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Jira API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const issues = data.issues || [];

    // Calculate statistics
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};
    const byType: Record<string, number> = {};

    issues.forEach((issue: any) => {
      const fields = issue.fields || {};
      const status = fields.status?.name || 'Unknown';
      const priority = fields.priority?.name || 'None';
      const assignee = fields.assignee?.displayName || 'Unassigned';
      const issueType = fields.issuetype?.name || 'Unknown';

      byStatus[status] = (byStatus[status] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
      byType[issueType] = (byType[issueType] || 0) + 1;
    });

    const result: StatisticsResponse = {
      success: true,
      statistics: {
        byStatus,
        byPriority,
        byAssignee,
        byType,
        total: issues.length,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching Jira statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch Jira statistics',
      },
      { status: 500 }
    );
  }
}

