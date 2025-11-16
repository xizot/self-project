import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { KanbanCard } from '@/lib/types';
import { z } from 'zod';
import { syncKanbanToTodo } from '@/lib/sync';

const cardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  position: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

// PATCH update card
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = cardSchema.parse(body);

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
    if (validated.position !== undefined) {
      updates.push('position = ?');
      values.push(validated.position);
    }
    if (validated.priority !== undefined) {
      updates.push('priority = ?');
      values.push(validated.priority);
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
      UPDATE kanban_cards 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const card = db
      .prepare('SELECT * FROM kanban_cards WHERE id = ?')
      .get(parseInt(id)) as KanbanCard;

    // Sync to todo if linked
    if (card) {
      syncKanbanToTodo(card.id, {
        title: card.title,
        description: card.description,
        status: card.status,
        priority: card.priority,
      });
    }

    return NextResponse.json(card);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating card:', error);
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    );
  }
}

// DELETE card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stmt = db.prepare('DELETE FROM kanban_cards WHERE id = ?');
    const result = stmt.run(parseInt(id));

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    );
  }
}
