import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { KanbanBoard } from '@/lib/types';
import { z } from 'zod';

const boardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// GET all boards
export async function GET() {
  try {
    const boards = db
      .prepare('SELECT * FROM kanban_boards ORDER BY created_at DESC')
      .all() as KanbanBoard[];
    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    );
  }
}

// POST create new board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = boardSchema.parse(body);

    const stmt = db.prepare(`
      INSERT INTO kanban_boards (name, description)
      VALUES (?, ?)
    `);

    const result = stmt.run(validated.name, validated.description || null);
    const board = db
      .prepare('SELECT * FROM kanban_boards WHERE id = ?')
      .get(result.lastInsertRowid) as KanbanBoard;

    return NextResponse.json(board, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating board:', error);
    return NextResponse.json(
      { error: 'Failed to create board' },
      { status: 500 }
    );
  }
}
