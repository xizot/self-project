import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { Password } from '@/lib/types';
import { decryptPassword } from '@/lib/password-encryption';

/**
 * Helper function to get Jira credentials and auth
 */
async function getJiraAuth(credentialId: number, userId: number) {
  const credential = db
    .prepare('SELECT * FROM passwords WHERE id = ? AND user_id = ?')
    .get(credentialId, userId) as Password | undefined;

  if (!credential) {
    throw new Error('Credential not found');
  }

  const appName = credential.app_name.toLowerCase();
  if (!appName.includes('jira')) {
    throw new Error('Selected credential is not a Jira credential');
  }

  const apiToken = decryptPassword(credential.password);
  const jiraUrl = (credential.url || '').replace(/\/$/, '');
  const email = credential.email || credential.username || '';

  if (!jiraUrl || !apiToken) {
    throw new Error('Jira URL or API token is missing in credential');
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return { jiraUrl, auth };
}

/**
 * POST - Create a new Jira issue
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { credential_id, projectKey, issueType, summary, description, priority, assignee } = body;

    if (!credential_id || !projectKey || !issueType || !summary) {
      return NextResponse.json(
        { success: false, error: 'credential_id, projectKey, issueType, and summary are required' },
        { status: 400 }
      );
    }

    const { jiraUrl, auth } = await getJiraAuth(parseInt(credential_id), user.id);

    // Build issue fields
    const fields: any = {
      project: { key: projectKey },
      summary: summary,
      issuetype: { name: issueType },
    };

    if (description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description,
              },
            ],
          },
        ],
      };
    }

    if (priority) {
      fields.priority = { name: priority };
    }

    if (assignee) {
      fields.assignee = { accountId: assignee };
    }

    const response = await fetch(`${jiraUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Jira API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      issue: {
        key: data.key,
        id: data.id,
        url: `${jiraUrl}/browse/${data.key}`,
      },
    });
  } catch (error: any) {
    console.error('Error creating Jira issue:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create Jira issue',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a Jira issue
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { credential_id, issueKey, fields: updateFields } = body;

    if (!credential_id || !issueKey || !updateFields) {
      return NextResponse.json(
        { success: false, error: 'credential_id, issueKey, and fields are required' },
        { status: 400 }
      );
    }

    const { jiraUrl, auth } = await getJiraAuth(parseInt(credential_id), user.id);

    // Transform fields to Jira format
    const fields: any = {};
    if (updateFields.summary) fields.summary = updateFields.summary;
    if (updateFields.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: updateFields.description,
              },
            ],
          },
        ],
      };
    }
    if (updateFields.priority) fields.priority = { name: updateFields.priority };
    if (updateFields.assignee) fields.assignee = { accountId: updateFields.assignee };
    if (updateFields.status) {
      // To update status, we need to do a transition
      // This will be handled separately
    }

    const response = await fetch(`${jiraUrl}/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Jira API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // If status needs to be updated, do transition
    if (updateFields.status) {
      // Get available transitions
      const transitionsResponse = await fetch(
        `${jiraUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      if (transitionsResponse.ok) {
        const transitionsData = await transitionsResponse.json();
        const targetTransition = transitionsData.transitions.find(
          (t: any) => t.to.name === updateFields.status || t.name === updateFields.status
        );

        if (targetTransition) {
          await fetch(`${jiraUrl}/rest/api/3/issue/${issueKey}/transitions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`,
            },
            body: JSON.stringify({
              transition: { id: targetTransition.id },
            }),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Issue updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating Jira issue:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update Jira issue',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a Jira issue
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const credentialId = searchParams.get('credential_id');
    const issueKey = searchParams.get('issue_key');

    if (!credentialId || !issueKey) {
      return NextResponse.json(
        { success: false, error: 'credential_id and issue_key are required' },
        { status: 400 }
      );
    }

    const { jiraUrl, auth } = await getJiraAuth(parseInt(credentialId), user.id);

    const response = await fetch(`${jiraUrl}/rest/api/3/issue/${issueKey}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Jira API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Issue deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting Jira issue:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete Jira issue',
      },
      { status: 500 }
    );
  }
}

