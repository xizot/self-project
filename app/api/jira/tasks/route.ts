import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { Password } from '@/lib/types';
import { decryptPassword } from '@/lib/password-encryption';

interface JiraTask {
  key: string;
  summary: string;
  status: string;
  priority: string;
  issueType: string;
  url: string;
  project?: {
    key: string;
    name: string;
  };
  assignee?: {
    displayName: string;
    emailAddress?: string;
  };
  created?: string;
  updated?: string;
}

interface JiraResponse {
  success: boolean;
  tasks?: JiraTask[];
  total?: number;
  error?: string;
}

/**
 * GET Jira tasks based on credential_id
 * Query params:
 * - credential_id: ID of the Jira credential in passwords table
 * - jql: Optional JQL query (default: assignee = currentUser() AND status != Done AND status != Cancel)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const credentialId = searchParams.get('credential_id');
    const jql = searchParams.get('jql') || 'assignee = currentUser() AND status != Done AND status != Cancel ORDER BY updated DESC';

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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 50,
        fields: [
          'summary',
          'status',
          'priority',
          'issuetype',
          'project',
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
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform Jira response to our format
    const tasks: JiraTask[] = (data.issues || []).map((issue: any) => {
      const fields = issue.fields || {};
      const project = fields.project || {};
      const assignee = fields.assignee || {};
      const status = fields.status || {};
      const priority = fields.priority || {};
      const issueType = fields.issuetype || {};

      return {
        key: issue.key,
        summary: fields.summary || 'No summary',
        status: status.name || 'Unknown',
        priority: priority.name || 'Unknown',
        issueType: issueType.name || 'Unknown',
        url: `${normalizedUrl}/browse/${issue.key}`,
        project: project.key
          ? {
              key: project.key,
              name: project.name || project.key,
            }
          : undefined,
        assignee: assignee.displayName
          ? {
              displayName: assignee.displayName,
              emailAddress: assignee.emailAddress,
            }
          : undefined,
        created: fields.created,
        updated: fields.updated,
      };
    });

    const result: JiraResponse = {
      success: true,
      tasks: tasks,
      total: data.total || tasks.length,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching Jira tasks:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch Jira tasks' 
      },
      { status: 500 }
    );
  }
}

