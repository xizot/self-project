import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import redis from '@/lib/redis';
import { Todo } from '@/lib/types';
import { z } from 'zod';
import { syncTodoToKanban } from '@/lib/sync';

const todoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional(),
  due_date: z.string().optional(),
});

// GET all todos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    let query = 'SELECT * FROM todos WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const todos = db.prepare(query).all(...params) as Todo[];

    // Cache in Redis (fail silently if Redis is unavailable)
    try {
      const cacheKey = `todos:${status || 'all'}:${category || 'all'}`;
      await redis.setex(cacheKey, 60, JSON.stringify(todos));
    } catch {
      // Redis unavailable, continue without cache
    }

    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

// POST create new todo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = todoSchema.parse(body);

    const stmt = db.prepare(`
      INSERT INTO todos (title, description, status, priority, category, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      validated.title,
      validated.description || null,
      validated.status || 'todo',
      validated.priority || 'medium',
      validated.category || null,
      validated.due_date || null
    );

    // Invalidate cache (fail silently if Redis is unavailable)
    try {
      await redis.del('todos:*');
    } catch {
      // Redis unavailable, continue without cache
    }

    const todo = db
      .prepare('SELECT * FROM todos WHERE id = ?')
      .get(result.lastInsertRowid) as Todo;

    // Sync to kanban
    syncTodoToKanban(todo.id, {
      title: todo.title,
      description: todo.description,
      status: todo.status,
      priority: todo.priority,
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
