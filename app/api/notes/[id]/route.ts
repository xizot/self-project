import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Note } from '@/lib/types';
import { z } from 'zod';

const noteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
});

// PATCH update note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = noteSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.title !== undefined) {
      updates.push('title = ?');
      values.push(validated.title);
    }
    if (validated.content !== undefined) {
      updates.push('content = ?');
      values.push(validated.content);
    }
    if (validated.category !== undefined) {
      updates.push('category = ?');
      values.push(validated.category);
    }
    if (validated.tags !== undefined) {
      updates.push('tags = ?');
      values.push(validated.tags);
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
      UPDATE notes 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const note = db
      .prepare('SELECT * FROM notes WHERE id = ?')
      .get(parseInt(id)) as Note;

    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    const result = stmt.run(parseInt(id));

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
