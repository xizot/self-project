import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Category } from '@/lib/types';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const categorySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  position: z.number().optional(),
});

// GET all categories
export async function GET() {
  try {
    const user = await requireAuth();
    const categories = db
      .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY position ASC, created_at DESC')
      .all(user.id) as Category[];

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = categorySchema.parse(body);

    // Get max position for user
    const maxPos = db
      .prepare('SELECT COALESCE(MAX(position), -1) as max_pos FROM categories WHERE user_id = ?')
      .get(user.id) as { max_pos: number };

    const stmt = db.prepare(`
      INSERT INTO categories (user_id, name, color, position)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.name,
      validated.color || '#6366f1',
      validated.position !== undefined ? validated.position : maxPos.max_pos + 1
    );

    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(result.lastInsertRowid) as Category;

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

