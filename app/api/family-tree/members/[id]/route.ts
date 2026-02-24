import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { FamilyMember } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const memberSchema = z.object({
  full_name: z.string().min(1).optional(),
  gender: z.enum(['male', 'female']).optional(),
  birth_date: z.string().optional().nullable(),
  death_date: z.string().optional().nullable(),
  is_alive: z.number().optional(),
  birth_order: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET single family member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const member = db
      .prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as FamilyMember | undefined;

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error fetching family member:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family member' },
      { status: 500 }
    );
  }
}

// PATCH update family member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = memberSchema.parse(body);

    const existing = db
      .prepare('SELECT id FROM family_members WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id);
    if (!existing) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(validated.full_name);
    }
    if (validated.gender !== undefined) {
      updates.push('gender = ?');
      values.push(validated.gender);
    }
    if (validated.birth_date !== undefined) {
      updates.push('birth_date = ?');
      values.push(validated.birth_date);
    }
    if (validated.death_date !== undefined) {
      updates.push('death_date = ?');
      values.push(validated.death_date);
    }
    if (validated.is_alive !== undefined) {
      updates.push('is_alive = ?');
      values.push(validated.is_alive);
    }
    if (validated.birth_order !== undefined) {
      updates.push('birth_order = ?');
      values.push(validated.birth_order);
    }
    if (validated.notes !== undefined) {
      updates.push('notes = ?');
      values.push(validated.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push("updated_at = datetime('now')");
    values.push(parseInt(id), user.id);

    db.prepare(
      `UPDATE family_members SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...values);

    const member = db
      .prepare('SELECT * FROM family_members WHERE id = ?')
      .get(parseInt(id)) as FamilyMember;

    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error updating family member:', error);
    return NextResponse.json(
      { error: 'Failed to update family member' },
      { status: 500 }
    );
  }
}

// DELETE family member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const result = db
      .prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?')
      .run(parseInt(id), user.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return NextResponse.json(
      { error: 'Failed to delete family member' },
      { status: 500 }
    );
  }
}
