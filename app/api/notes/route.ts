import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Note } from '@/lib/types';
import { z } from 'zod';

const noteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
});

// GET all notes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');

    let query = 'SELECT * FROM notes WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (tag) {
      query += ' AND tags LIKE ?';
      params.push(`%${tag}%`);
    }

    query += ' ORDER BY updated_at DESC';

    const notes = db.prepare(query).all(...params) as Note[];
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

// POST create new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = noteSchema.parse(body);

    const stmt = db.prepare(`
      INSERT INTO notes (title, content, category, tags)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      validated.title,
      validated.content || null,
      validated.category || null,
      validated.tags || null
    );

    const note = db
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(result.lastInsertRowid) as Note;

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
