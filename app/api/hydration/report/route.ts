import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getHydrationReport } from '@/lib/hydration';

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const format = (d: Date) => d.toISOString().slice(0, 10);
  return { start: format(start), end: format(end) };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const days = Math.max(
      1,
      Math.min(30, Number(request.nextUrl.searchParams.get('days')) || 7)
    );
    const { start, end } = getDateRange(days);
    const data = getHydrationReport(user.id, start, end);

    return NextResponse.json({
      range: { start, end },
      data,
    });
  } catch (error: any) {
    console.error('Error fetching hydration report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load hydration report' },
      { status: 500 }
    );
  }
}

