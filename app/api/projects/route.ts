import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Project } from '@/lib/types';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

// GET all projects
export async function GET() {
  try {
    const user = await requireAuth();
    const projects = db
      .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC')
      .all(user.id) as Project[];
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST create new project
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = projectSchema.parse(body);

    const stmt = db.prepare(`
      INSERT INTO projects (user_id, name, description, color)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.name,
      validated.description || null,
      validated.color || null
    );

    const project = db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(result.lastInsertRowid) as Project;

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
