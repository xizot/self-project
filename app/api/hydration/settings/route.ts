import { requireAuth } from '@/lib/auth';
import { getHydrationSettings, updateHydrationSettings } from '@/lib/hydration';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await requireAuth();
    const settings = getHydrationSettings(user.id);
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching hydration settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load hydration settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const updates: Parameters<typeof updateHydrationSettings>[1] = {};

    if ('is_active' in body || 'isActive' in body) {
      updates.is_active =
        typeof body.is_active === 'boolean'
          ? body.is_active
          : Boolean(body.isActive);
    }
    if ('reminder_sound' in body) {
      updates.reminder_sound =
        typeof body.reminder_sound === 'string' ? body.reminder_sound : null;
    }
    if ('custom_schedule' in body) {
      updates.custom_schedule = Array.isArray(body.custom_schedule)
        ? body.custom_schedule
        : null;
    }
    if ('weight' in body) {
      updates.weight = typeof body.weight === 'number' ? body.weight : null;
    }
    if ('activity_level' in body) {
      updates.activity_level =
        typeof body.activity_level === 'string' ? body.activity_level : null;
    }

    const updated = updateHydrationSettings(user.id, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating hydration settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update hydration settings' },
      { status: 500 }
    );
  }
}
