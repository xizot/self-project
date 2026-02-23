import { requireAuth } from '@/lib/auth';
import {
  confirmHydrationSlot,
  getHydrationLogs,
  getHydrationSettings,
  hydrationSchedule,
} from '@/lib/hydration';
import { NextRequest, NextResponse } from 'next/server';

function normalizeDate(date?: string | null) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const date = normalizeDate(searchParams.get('date'));

    const logs = getHydrationLogs(user.id, date);
    const settings = getHydrationSettings(user.id);

    return NextResponse.json({
      date,
      schedule: settings.custom_schedule ?? hydrationSchedule,
      logs,
      settings,
    });
  } catch (error: any) {
    console.error('Error fetching hydration logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load hydration logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const date = normalizeDate(body.date);
    const slotIndex = Number(body.slot_index);

    if (Number.isNaN(slotIndex)) {
      return NextResponse.json(
        { error: 'slot_index is required' },
        { status: 400 }
      );
    }

    const log = confirmHydrationSlot(user.id, date, slotIndex);

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error('Error confirming hydration slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm hydration slot' },
      { status: 500 }
    );
  }
}
