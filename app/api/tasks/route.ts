import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Task } from '@/lib/types';
import { z } from 'zod';

const taskSchema = z.object({
  project_id: z.number().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional(),
  status_id: z.number(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional(),
  due_date: z.string().optional(),
  position: z.number().optional(),
});

// GET all tasks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const statusId = searchParams.get('status_id');

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(parseInt(projectId));
    }

    if (statusId) {
      query += ' AND status_id = ?';
      params.push(parseInt(statusId));
    }

    query += ' ORDER BY position ASC, created_at DESC';

    const tasks = db.prepare(query).all(...params) as Task[];

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = taskSchema.parse(body);

    // Get max position for the status
    const maxPos = db
      .prepare(
        `
      SELECT COALESCE(MAX(position), -1) as max_pos 
      FROM tasks 
      WHERE status_id = ? ${validated.project_id ? 'AND project_id = ?' : 'AND project_id IS NULL'}
    `
      )
      .get(
        validated.status_id,
        ...(validated.project_id ? [validated.project_id] : [])
      ) as { max_pos: number };

    const stmt = db.prepare(`
      INSERT INTO tasks (project_id, title, description, status_id, priority, category, due_date, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      validated.project_id || null,
      validated.title,
      validated.description || null,
      validated.status_id,
      validated.priority || 'medium',
      validated.category || null,
      validated.due_date || null,
      validated.position !== undefined ? validated.position : maxPos.max_pos + 1
    );

    const task = db
      .prepare('SELECT * FROM tasks WHERE id = ?')
      .get(result.lastInsertRowid) as Task;

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
