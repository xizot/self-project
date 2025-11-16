import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { App } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const appSchema = z.object({
  name: z.string().min(1, 'Tên ứng dụng là bắt buộc'),
});

// GET all apps
export async function GET() {
  try {
    const user = await requireAuth();
    const apps = db
      .prepare('SELECT * FROM apps WHERE user_id = ? ORDER BY name ASC')
      .all(user.id) as App[];

    return NextResponse.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch apps' },
      { status: 500 }
    );
  }
}

// POST create new app
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = appSchema.parse(body);

    // Check if app already exists for this user
    const existing = db
      .prepare('SELECT id FROM apps WHERE user_id = ? AND name = ?')
      .get(user.id, validated.name);

    if (existing) {
      return NextResponse.json(
        { error: 'Ứng dụng đã tồn tại' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO apps (user_id, name)
      VALUES (?, ?)
    `);

    const result = stmt.run(user.id, validated.name);

    const app = db
      .prepare('SELECT * FROM apps WHERE id = ?')
      .get(result.lastInsertRowid) as App;

    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating app:', error);
    return NextResponse.json(
      { error: 'Failed to create app' },
      { status: 500 }
    );
  }
}
