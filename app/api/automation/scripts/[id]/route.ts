import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { AutomationScript } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const scriptSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  path: z.string().min(1).optional(),
});

// GET single automation script
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const script = db
      .prepare('SELECT * FROM automation_scripts WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationScript | undefined;

    if (!script) {
      return NextResponse.json(
        { error: 'Automation script not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error fetching automation script:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation script' },
      { status: 500 }
    );
  }
}

// PATCH update automation script
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = scriptSchema.parse(body);

    // Check if script exists and belongs to user
    const existing = db
      .prepare('SELECT * FROM automation_scripts WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationScript | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Automation script not found' },
        { status: 404 }
      );
    }

    // Check if new name conflicts with another script
    if (validated.name && validated.name !== existing.name) {
      const nameConflict = db
        .prepare('SELECT id FROM automation_scripts WHERE user_id = ? AND name = ?')
        .get(user.id, validated.name);

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Tên script đã tồn tại' },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.description !== undefined) {
      updates.push('description = ?');
      values.push(validated.description);
    }
    if (validated.path !== undefined) {
      updates.push('path = ?');
      values.push(validated.path);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = datetime("now")');
    values.push(parseInt(id), user.id);

    const stmt = db.prepare(`
      UPDATE automation_scripts
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(...values);

    const updated = db
      .prepare('SELECT * FROM automation_scripts WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationScript;

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating automation script:', error);
    return NextResponse.json(
      { error: 'Failed to update automation script' },
      { status: 500 }
    );
  }
}

// DELETE automation script
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if script exists and belongs to user
    const existing = db
      .prepare('SELECT * FROM automation_scripts WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationScript | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Automation script not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM automation_scripts WHERE id = ? AND user_id = ?').run(
      parseInt(id),
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting automation script:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation script' },
      { status: 500 }
    );
  }
}

