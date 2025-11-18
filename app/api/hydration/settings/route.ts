import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getHydrationSettings, updateHydrationSettings } from '@/lib/hydration';

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
    const isActive =
      typeof body.is_active === 'boolean'
        ? body.is_active
        : Boolean(body.isActive);
    const reminderSound = typeof body.reminder_sound === 'string' ? body.reminder_sound : undefined;

    const updated = updateHydrationSettings(user.id, isActive, reminderSound);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating hydration settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update hydration settings' },
      { status: 500 }
    );
  }
}

