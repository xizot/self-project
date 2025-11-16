import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Password } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { encryptPassword, decryptPassword } from '@/lib/password-encryption';
import { z } from 'zod';

const passwordSchema = z.object({
  app_name: z.string().min(1).optional(),
  type: z.enum(['password', 'webhook', 'api_key', 'token', 'other']).optional(),
  username: z.string().optional().nullable(),
  password: z.string().min(1).optional(),
});

// GET single password
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const password = db
      .prepare('SELECT * FROM passwords WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as Password | undefined;

    if (!password) {
      return NextResponse.json(
        { error: 'Password not found' },
        { status: 404 }
      );
    }

    // Return decrypted password
    return NextResponse.json({
      ...password,
      password: decryptPassword(password.password),
    });
  } catch (error) {
    console.error('Error fetching password:', error);
    return NextResponse.json(
      { error: 'Failed to fetch password' },
      { status: 500 }
    );
  }
}

// PATCH update password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = passwordSchema.parse(body);

    // Verify password belongs to user
    const existingPassword = db
      .prepare('SELECT id FROM passwords WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id);

    if (!existingPassword) {
      return NextResponse.json(
        { error: 'Password not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.app_name !== undefined) {
      updates.push('app_name = ?');
      values.push(validated.app_name);
    }
    if (validated.username !== undefined) {
      updates.push('username = ?');
      values.push(validated.username);
    }
    if (validated.type !== undefined) {
      updates.push('type = ?');
      values.push(validated.type);
    }
    if (validated.password !== undefined) {
      updates.push('password = ?');
      values.push(encryptPassword(validated.password));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(parseInt(id), user.id);

    const stmt = db.prepare(`
      UPDATE passwords
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(...values);

    const password = db
      .prepare('SELECT * FROM passwords WHERE id = ?')
      .get(parseInt(id)) as Password;

    // Return decrypted password
    return NextResponse.json({
      ...password,
      password: validated.password !== undefined
        ? validated.password
        : decryptPassword(password.password),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}

// DELETE password
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const stmt = db.prepare('DELETE FROM passwords WHERE id = ? AND user_id = ?');
    const result = stmt.run(parseInt(id), user.id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Password not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting password:', error);
    return NextResponse.json(
      { error: 'Failed to delete password' },
      { status: 500 }
    );
  }
}

