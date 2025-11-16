import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { KanbanCard } from '@/lib/types';
import { z } from 'zod';

const cardSchema = z.object({
  board_id: z.number(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  position: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

// GET all cards for a board
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardId = searchParams.get('board_id');

    if (!boardId) {
      return NextResponse.json(
        { error: 'board_id is required' },
        { status: 400 }
      );
    }

    const cards = db
      .prepare(
        `
      SELECT * FROM kanban_cards 
      WHERE board_id = ? 
      ORDER BY position ASC, created_at ASC
    `
      )
      .all(parseInt(boardId)) as KanbanCard[];

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

// POST create new card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = cardSchema.parse(body);

    // Get max position for the status
    const maxPos = db
      .prepare(
        `
      SELECT COALESCE(MAX(position), -1) as max_pos 
      FROM kanban_cards 
      WHERE board_id = ? AND status = ?
    `
      )
      .get(validated.board_id, validated.status || 'todo') as {
      max_pos: number;
    };

    const stmt = db.prepare(`
      INSERT INTO kanban_cards (board_id, title, description, status, position, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      validated.board_id,
      validated.title,
      validated.description || null,
      validated.status || 'todo',
      validated.position !== undefined
        ? validated.position
        : maxPos.max_pos + 1,
      validated.priority || 'medium'
    );

    const card = db
      .prepare('SELECT * FROM kanban_cards WHERE id = ?')
      .get(result.lastInsertRowid) as KanbanCard;

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating card:', error);
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    );
  }
}
