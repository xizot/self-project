import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { decryptPassword } from '@/lib/password-encryption';
import { Password } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export interface Sprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
  startDate?: string;
  endDate?: string;
  boardId: number;
  boardName: string;
}

/**
 * GET /api/jira/sprints?credential_id=...
 * Returns all sprints (active + closed) from all accessible Jira Scrum boards.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const credentialId = request.nextUrl.searchParams.get('credential_id');

    if (!credentialId) {
      return NextResponse.json(
        { error: 'credential_id is required' },
        { status: 400 }
      );
    }

    const credential = db
      .prepare('SELECT * FROM passwords WHERE id = ? AND user_id = ?')
      .get(parseInt(credentialId), user.id) as Password | undefined;

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    const apiToken = decryptPassword(credential.password);
    const jiraUrl = (credential.url || '').replace(/\/$/, '');
    const email = credential.email || credential.username || '';

    if (!jiraUrl || !apiToken) {
      return NextResponse.json(
        { error: 'Jira URL or API token is missing' },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    };

    // Fetch all boards the user has access to
    const boardsRes = await fetch(
      `${jiraUrl}/rest/agile/1.0/board?maxResults=50`,
      { headers }
    );

    if (!boardsRes.ok) {
      const text = await boardsRes.text();
      return NextResponse.json(
        { error: `Failed to fetch boards: ${boardsRes.status}`, details: text },
        { status: boardsRes.status }
      );
    }

    const boardsData = await boardsRes.json();
    const boards: { id: number; name: string }[] = boardsData.values || [];

    // Fetch sprints for each board in parallel
    const sprintResults = await Promise.allSettled(
      boards.map(async (board) => {
        const res = await fetch(
          `${jiraUrl}/rest/agile/1.0/board/${board.id}/sprint?state=active,closed&maxResults=20`,
          { headers }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.values || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          state: s.state as Sprint['state'],
          startDate: s.startDate,
          endDate: s.endDate,
          boardId: board.id,
          boardName: board.name,
        })) as Sprint[];
      })
    );

    const allSprints: Sprint[] = sprintResults
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      // Deduplicate by sprint id
      .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

    // Sort: active first, then by sprint id descending (most recent first)
    allSprints.sort((a, b) => {
      if (a.state === 'active' && b.state !== 'active') return -1;
      if (a.state !== 'active' && b.state === 'active') return 1;
      return b.id - a.id;
    });

    return NextResponse.json({ success: true, sprints: allSprints });
  } catch (error: any) {
    console.error('Error fetching Jira sprints:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch sprints' },
      { status: 500 }
    );
  }
}
