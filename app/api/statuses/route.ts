import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Status } from '@/lib/types';
import { z } from 'zod';

const statusSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  position: z.number().optional(),
});

// GET all statuses
export async function GET() {
  try {
    const statuses = db
      .prepare('SELECT * FROM statuses ORDER BY position ASC, created_at ASC')
      .all() as Status[];
    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}

// POST create new status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = statusSchema.parse(body);

    // Get max position
    const maxPos = db
      .prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM statuses')
      .get() as { max_pos: number };

    const stmt = db.prepare(`
      INSERT INTO statuses (name, color, position)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      validated.name,
      validated.color,
      validated.position !== undefined ? validated.position : maxPos.max_pos + 1
    );

    const status = db
      .prepare('SELECT * FROM statuses WHERE id = ?')
      .get(result.lastInsertRowid) as Status;

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating status:', error);
    return NextResponse.json(
      { error: 'Failed to create status' },
      { status: 500 }
    );
  }
}
