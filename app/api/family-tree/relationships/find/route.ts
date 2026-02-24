import { requireAuth } from '@/lib/auth';
import db from '@/lib/db';
import { FamilyMember, FamilyRelationship } from '@/lib/types';
import {
  findRelationship,
  Region,
} from '@/src/features/family-tree/vietnamese-kinship';
import { NextRequest, NextResponse } from 'next/server';

// GET find relationship between two people
// ?personA=1&personB=2
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const personAId = searchParams.get('personA');
    const personBId = searchParams.get('personB');

    if (!personAId || !personBId) {
      return NextResponse.json(
        { error: 'personA and personB are required' },
        { status: 400 }
      );
    }

    const members = db
      .prepare('SELECT * FROM family_members WHERE user_id = ?')
      .all(user.id) as FamilyMember[];

    const relationships = db
      .prepare('SELECT * FROM family_relationships WHERE user_id = ?')
      .all(user.id) as FamilyRelationship[];

    const regionParam = searchParams.get('region');
    const region: Region =
      regionParam === 'trung' || regionParam === 'nam' ? regionParam : 'bac';

    const result = findRelationship(
      parseInt(personAId),
      parseInt(personBId),
      members,
      relationships,
      region
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Không tìm thấy mối quan hệ giữa hai người này' },
        { status: 404 }
      );
    }

    // Enrich path with member names
    const pathWithNames = result.path.map((id) => {
      const member = members.find((m) => m.id === id);
      return { id, name: member?.full_name || 'N/A' };
    });

    return NextResponse.json({
      ...result,
      pathWithNames,
      personA: members.find((m) => m.id === parseInt(personAId)),
      personB: members.find((m) => m.id === parseInt(personBId)),
    });
  } catch (error) {
    console.error('Error finding relationship:', error);
    return NextResponse.json(
      { error: 'Failed to find relationship' },
      { status: 500 }
    );
  }
}
