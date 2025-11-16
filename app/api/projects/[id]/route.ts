import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Project } from '@/lib/types';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

// PATCH update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = projectSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.description !== undefined) {
      updates.push('description = ?');
      values.push(validated.description);
    }
    if (validated.color !== undefined) {
      updates.push('color = ?');
      values.push(validated.color);
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
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(parseInt(id)) as Project;

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(parseInt(id));

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
