import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import redis from '@/lib/redis';
import { Todo } from '@/lib/types';
import { z } from 'zod';
import { syncTodoToKanban, deleteKanbanCardByTodoId } from '@/lib/sync';

const todoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

// GET single todo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const todo = db
      .prepare('SELECT * FROM todos WHERE id = ?')
      .get(parseInt(id)) as Todo | undefined;

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo' },
      { status: 500 }
    );
  }
}

// PATCH update todo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = todoSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.title !== undefined) {
      updates.push('title = ?');
      values.push(validated.title);
    }
    if (validated.description !== undefined) {
      updates.push('description = ?');
      values.push(validated.description);
    }
    if (validated.status !== undefined) {
      updates.push('status = ?');
      values.push(validated.status);
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

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(parseInt(id));

    const stmt = db.prepare(`
      UPDATE todos 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Invalidate cache (fail silently if Redis is unavailable)
    try {
      await redis.del('todos:*');
    } catch {
      // Redis unavailable, continue without cache
    }

    const todo = db
      .prepare('SELECT * FROM todos WHERE id = ?')
      .get(parseInt(id)) as Todo;

    // Sync to kanban
    syncTodoToKanban(todo.id, {
      title: todo.title,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
    });

    return NextResponse.json(todo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

// DELETE todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete associated kanban card first
    deleteKanbanCardByTodoId(parseInt(id));

    const stmt = db.prepare('DELETE FROM todos WHERE id = ?');
    const result = stmt.run(parseInt(id));

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Invalidate cache (fail silently if Redis is unavailable)
    try {
      await redis.del('todos:*');
    } catch {
      // Redis unavailable, continue without cache
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
