import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Task } from '@/lib/types';
import { z } from 'zod';

const taskSchema = z.object({
  project_id: z.number().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status_id: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  position: z.number().optional(),
});

// PATCH update task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = taskSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.project_id !== undefined) {
      updates.push('project_id = ?');
      values.push(validated.project_id);
    }
    if (validated.title !== undefined) {
      updates.push('title = ?');
      values.push(validated.title);
    }
    if (validated.description !== undefined) {
      updates.push('description = ?');
      values.push(validated.description);
    }
    if (validated.status_id !== undefined) {
      updates.push('status_id = ?');
      values.push(validated.status_id);
    }
    if (validated.priority !== undefined) {
      updates.push('priority = ?');
      values.push(validated.priority);
    }
    if (validated.category !== undefined) {
      updates.push('category = ?');
      values.push(validated.category);
    }
    if (validated.due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(validated.due_date);
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
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(parseInt(id)) as Task;

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(parseInt(id));

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
