import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Status } from '@/lib/types';
import { z } from 'zod';

const statusSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  position: z.number().optional(),
});

// PATCH update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = statusSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.color !== undefined) {
      updates.push('color = ?');
      values.push(validated.color);
    }
    if (validated.position !== undefined) {
      updates.push('position = ?');
      values.push(validated.position);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(parseInt(id));

    const stmt = db.prepare(`
      UPDATE statuses
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const status = db
      .prepare('SELECT * FROM statuses WHERE id = ?')
      .get(parseInt(id)) as Status;

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}

// DELETE status
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if status is being used
    const taskCount = db
      .prepare('SELECT COUNT(*) as count FROM tasks WHERE status_id = ?')
      .get(parseInt(id)) as { count: number };

    if (taskCount.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete status that is being used by tasks' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('DELETE FROM statuses WHERE id = ?');
    const result = stmt.run(parseInt(id));

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting status:', error);
    return NextResponse.json(
      { error: 'Failed to delete status' },
      { status: 500 }
    );
  }
}
