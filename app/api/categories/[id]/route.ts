import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Category } from '@/lib/types';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const categorySchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  position: z.number().optional(),
});

// PATCH update category
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = categorySchema.parse(body);

    // Verify category belongs to user
    const existingCategory = db
      .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id);
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.color !== undefined) {
      updates.push('color = ?');
      values.push(validated.color);
    }
    if (validated.position !== undefined) {
      updates.push('position = ?');
      values.push(validated.position);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(parseInt(id), user.id);

    const stmt = db.prepare(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    );
    stmt.run(...values);

    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(parseInt(id)) as Category;

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Verify category belongs to user
    const existingCategory = db
      .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id);
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if category is used in tasks
    const categoryName = db
      .prepare('SELECT name FROM categories WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as { name: string } | undefined;
    
    if (categoryName) {
      const tasksWithCategory = db
        .prepare('SELECT COUNT(*) as count FROM tasks WHERE category = ? AND user_id = ?')
        .get(categoryName.name, user.id) as { count: number };

      if (tasksWithCategory.count > 0) {
        return NextResponse.json(
          { error: 'Cannot delete category that is used in tasks' },
          { status: 400 }
        );
      }
    }

    const stmt = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?');
    const result = stmt.run(parseInt(id), user.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

