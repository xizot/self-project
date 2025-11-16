import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Task } from '@/lib/types';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

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
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const statusId = searchParams.get('status_id');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'position';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params: any[] = [user.id];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(parseInt(projectId));
    }

    if (statusId) {
      query += ' AND status_id = ?';
      params.push(parseInt(statusId));
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (dateFrom) {
      query += ' AND due_date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND due_date <= ?';
      // If dateTo is just a date (YYYY-MM-DD), add time to end of day
      const dateToValue = dateTo.length === 10 ? `${dateTo}T23:59:59` : dateTo;
      params.push(dateToValue);
    }

    // Sort
    const validSortBy = ['created_at', 'due_date', 'title', 'priority', 'position'];
    const validSortOrder = ['asc', 'desc'];
    const sortByField = validSortBy.includes(sortBy) ? sortBy : 'position';
    const sortOrderField = validSortOrder.includes(sortOrder) ? sortOrder : 'asc';

    // Handle special cases for sorting
    if (sortByField === 'title') {
      query += ` ORDER BY title ${sortOrderField.toUpperCase()}`;
    } else if (sortByField === 'priority') {
      // Priority: high > medium > low
      query += ` ORDER BY CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END ${sortOrderField.toUpperCase()}`;
    } else {
      query += ` ORDER BY ${sortByField} ${sortOrderField.toUpperCase()}`;
    }

    // Default secondary sort
    if (sortByField !== 'created_at') {
      query += ', created_at DESC';
    }

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
    const user = await requireAuth();
    const body = await request.json();
    const validated = taskSchema.parse(body);

    // Verify status belongs to user
    const status = db
      .prepare('SELECT id FROM statuses WHERE id = ? AND user_id = ?')
      .get(validated.status_id, user.id);
    if (!status) {
      return NextResponse.json(
        { error: 'Status not found' },
        { status: 404 }
      );
    }

    // Verify project belongs to user if provided
    if (validated.project_id) {
      const project = db
        .prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?')
        .get(validated.project_id, user.id);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Get max position for the status
    const maxPos = db
      .prepare(
        `
      SELECT COALESCE(MAX(position), -1) as max_pos 
      FROM tasks 
      WHERE user_id = ? AND status_id = ? ${validated.project_id ? 'AND project_id = ?' : 'AND project_id IS NULL'}
    `
      )
      .get(
        user.id,
        validated.status_id,
        ...(validated.project_id ? [validated.project_id] : [])
      ) as { max_pos: number };

    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, project_id, title, description, status_id, priority, category, due_date, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
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
