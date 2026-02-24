import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { FamilyRelationship } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const relationshipSchema = z.object({
  person_id: z.number(),
  related_person_id: z.number(),
  relationship_type: z.enum(['parent_child', 'spouse']),
});

// GET all relationships
export async function GET() {
  try {
    const user = await requireAuth();
    const relationships = db
      .prepare('SELECT * FROM family_relationships WHERE user_id = ?')
      .all(user.id) as FamilyRelationship[];
    return NextResponse.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    );
  }
}

// POST create new relationship
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = relationshipSchema.parse(body);

    if (validated.person_id === validated.related_person_id) {
      return NextResponse.json(
        { error: 'Cannot create relationship with self' },
        { status: 400 }
      );
    }

    // Verify both members belong to user
    const person = db
      .prepare('SELECT id FROM family_members WHERE id = ? AND user_id = ?')
      .get(validated.person_id, user.id);
    const related = db
      .prepare('SELECT id FROM family_members WHERE id = ? AND user_id = ?')
      .get(validated.related_person_id, user.id);

    if (!person || !related) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check duplicate
    const existing = db
      .prepare(
        `SELECT id FROM family_relationships
         WHERE user_id = ? AND person_id = ? AND related_person_id = ? AND relationship_type = ?`
      )
      .get(
        user.id,
        validated.person_id,
        validated.related_person_id,
        validated.relationship_type
      );

    if (existing) {
      return NextResponse.json(
        { error: 'Relationship already exists' },
        { status: 409 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO family_relationships (user_id, person_id, related_person_id, relationship_type)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.person_id,
      validated.related_person_id,
      validated.relationship_type
    );

    const rel = db
      .prepare('SELECT * FROM family_relationships WHERE id = ?')
      .get(result.lastInsertRowid) as FamilyRelationship;

    return NextResponse.json(rel, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: (error as any).errors },
        { status: 400 }
      );
    }
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}

// DELETE relationship
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const result = db
      .prepare('DELETE FROM family_relationships WHERE id = ? AND user_id = ?')
      .run(parseInt(id), user.id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json(
      { error: 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}
