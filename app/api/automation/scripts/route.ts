import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { AutomationScript } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const scriptSchema = z.object({
  name: z.string().min(1, 'Tên script là bắt buộc'),
  description: z.string().optional(),
  path: z.string().min(1, 'Đường dẫn script là bắt buộc'),
});

// GET all automation scripts
export async function GET() {
  try {
    const user = await requireAuth();
    const scripts = db
      .prepare(
        'SELECT * FROM automation_scripts WHERE user_id = ? ORDER BY name ASC'
      )
      .all(user.id) as AutomationScript[];

    return NextResponse.json(scripts);
  } catch (error) {
    console.error('Error fetching automation scripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation scripts' },
      { status: 500 }
    );
  }
}

// POST create new automation script
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = scriptSchema.parse(body);

    // Check if script name already exists for this user
    const existing = db
      .prepare('SELECT id FROM automation_scripts WHERE user_id = ? AND name = ?')
      .get(user.id, validated.name);

    if (existing) {
      return NextResponse.json(
        { error: 'Tên script đã tồn tại' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO automation_scripts (user_id, name, description, path)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.name,
      validated.description || null,
      validated.path
    );

    const script = db
      .prepare('SELECT * FROM automation_scripts WHERE id = ?')
      .get(result.lastInsertRowid) as AutomationScript;

    return NextResponse.json(script, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating automation script:', error);
    return NextResponse.json(
      { error: 'Failed to create automation script' },
      { status: 500 }
    );
  }
}

