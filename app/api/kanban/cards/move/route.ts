import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { syncKanbanToTodo } from '@/lib/sync';

const moveSchema = z.object({
  cardId: z.number(),
  newStatus: z.enum(['todo', 'in-progress', 'done']),
  newPosition: z.number(),
});

// POST move card (update status and position)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = moveSchema.parse(body);

    // Get current card
    const card = db
      .prepare('SELECT * FROM kanban_cards WHERE id = ?')
      .get(validated.cardId) as any;
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Update positions of other cards in the new status column
    if (card.status !== validated.newStatus) {
      // Shift cards in new status
      db.prepare(
        `
        UPDATE kanban_cards 
        SET position = position + 1 
        WHERE board_id = ? AND status = ? AND position >= ?
      `
      ).run(card.board_id, validated.newStatus, validated.newPosition);

      // Adjust positions in old status
      db.prepare(
        `
        UPDATE kanban_cards 
        SET position = position - 1 
        WHERE board_id = ? AND status = ? AND position > ?
      `
      ).run(card.board_id, card.status, card.position);
    } else {
      // Same status, just reordering
      if (card.position < validated.newPosition) {
        db.prepare(
          `
          UPDATE kanban_cards 
          SET position = position - 1 
          WHERE board_id = ? AND status = ? AND position > ? AND position <= ?
        `
        ).run(
          card.board_id,
          validated.newStatus,
          card.position,
          validated.newPosition
        );
      } else {
        db.prepare(
          `
          UPDATE kanban_cards 
          SET position = position + 1 
          WHERE board_id = ? AND status = ? AND position >= ? AND position < ?
        `
        ).run(
          card.board_id,
          validated.newStatus,
          validated.newPosition,
          card.position
        );
      }
    }

    // Update the card
    db.prepare(
      `
      UPDATE kanban_cards 
      SET status = ?, position = ?, updated_at = datetime('now')
      WHERE id = ?
    `
    ).run(validated.newStatus, validated.newPosition, validated.cardId);

    // Sync to todo if linked
    const updatedCard = db
      .prepare('SELECT * FROM kanban_cards WHERE id = ?')
      .get(validated.cardId) as any;
    if (updatedCard && updatedCard.todo_id) {
      syncKanbanToTodo(updatedCard.id, {
        title: updatedCard.title,
        description: updatedCard.description,
        status: validated.newStatus,
        priority: updatedCard.priority,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error moving card:', error);
    return NextResponse.json({ error: 'Failed to move card' }, { status: 500 });
  }
}
