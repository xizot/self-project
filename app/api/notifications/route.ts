import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  clearNotificationByMetadata,
  createNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread') === '1';
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get('limit') || 10))
    );

    const notifications = getNotifications(user.id, { unreadOnly, limit });
    const unreadCount = getNotifications(user.id, { unreadOnly: true, limit: 100 })
      .length;

    return NextResponse.json({
      notifications,
      unread_count: unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const action = body.action || 'create';

    if (action === 'mark_read') {
      const id = Number(body.id);
      if (Number.isNaN(id)) {
        return NextResponse.json(
          { error: 'Notification id is required' },
          { status: 400 }
        );
      }
      markNotificationRead(user.id, id);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_all_read') {
      markAllNotificationsRead(user.id);
      return NextResponse.json({ success: true });
    }

    if (action === 'clear_by_metadata') {
      const { type, metadata } = body;
      if (!type) {
        return NextResponse.json({ error: 'type is required' }, { status: 400 });
      }
      clearNotificationByMetadata(user.id, type, metadata);
      return NextResponse.json({ success: true });
    }

    const { type, message, metadata } = body;
    if (!type || !message) {
      return NextResponse.json(
        { error: 'type and message are required' },
        { status: 400 }
      );
    }

    const notification = createNotification(user.id, type, message, metadata);
    return NextResponse.json({ success: true, id: notification.id });
  } catch (error: any) {
    console.error('Error handling notification request:', error);
    return NextResponse.json(
      { error: error.message || 'Notification action failed' },
      { status: 500 }
    );
  }
}

