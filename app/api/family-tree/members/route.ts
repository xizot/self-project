import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { FamilyMember } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const memberSchema = z.object({
  full_name: z.string().min(1),
  gender: z.enum(['male', 'female']),
  birth_date: z.string().optional().nullable(),
  death_date: z.string().optional().nullable(),
  is_alive: z.number().optional(),
  birth_order: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET all family members
export async function GET() {
  try {
    const user = await requireAuth();
    const members = db
      .prepare(
        'SELECT * FROM family_members WHERE user_id = ? ORDER BY birth_order ASC, full_name ASC'
      )
      .all(user.id) as FamilyMember[];
    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
      { status: 500 }
    );
  }
}

// POST create new family member
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = memberSchema.parse(body);

    const stmt = db.prepare(`
      INSERT INTO family_members (user_id, full_name, gender, birth_date, death_date, is_alive, birth_order, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.full_name,
      validated.gender,
      validated.birth_date || null,
      validated.death_date || null,
      validated.is_alive ?? 1,
      validated.birth_order ?? null,
      validated.notes || null
    );

    const member = db
      .prepare('SELECT * FROM family_members WHERE id = ?')
      .get(result.lastInsertRowid) as FamilyMember;

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating family member:', error);
    return NextResponse.json(
      { error: 'Failed to create family member' },
      { status: 500 }
    );
  }
}
