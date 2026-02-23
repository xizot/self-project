import db from './db';

export interface AppNotification {
  id: number;
  type: string;
  message: string;
  metadata: string | null;
  is_read: number;
  created_at: string;
}

interface GetOptions {
  unreadOnly?: boolean;
  limit?: number;
}

export function getNotifications(userId: number, options: GetOptions = {}): AppNotification[] {
  const limit = options.limit ?? 10;
  const unreadOnly = options.unreadOnly ? 1 : null;

  const baseQuery = `
    SELECT id, type, message, metadata, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ${unreadOnly !== null ? 'AND is_read = 0' : ''}
    ORDER BY created_at DESC
    LIMIT ?
  `;

  return db.prepare(baseQuery).all(userId, limit) as AppNotification[];
}

const stringifyMetadata = (metadata?: Record<string, any> | null) =>
  metadata ? JSON.stringify(metadata) : null;

export function createNotification(
  userId: number,
  type: string,
  message: string,
  metadata?: Record<string, any>
) {
  const metadataString = stringifyMetadata(metadata);

  const existing = db
    .prepare(
      `SELECT id, is_read FROM notifications
       WHERE user_id = ? AND type = ? AND IFNULL(metadata, '') = IFNULL(?, '')`
    )
    .get(userId, type, metadataString ?? null) as { id: number; is_read: number } | undefined;

  if (existing) {
    if (existing.is_read === 0) {
      return existing;
    }
    db.prepare(
      `UPDATE notifications
       SET is_read = 0, message = ?, created_at = datetime('now')
       WHERE id = ?`
    ).run(message, existing.id);
    return existing;
  }

  const result = db
    .prepare(
      `INSERT INTO notifications (user_id, type, message, metadata)
       VALUES (?, ?, ?, ?)`
    )
    .run(userId, type, message, metadataString);

  return { id: Number(result.lastInsertRowid) };
}

export function markNotificationRead(userId: number, notificationId: number) {
  db.prepare(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?`
  ).run(userId, notificationId);
}

export function markAllNotificationsRead(userId: number) {
  db.prepare(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`
  ).run(userId);
}

export function clearNotificationByMetadata(
  userId: number,
  type: string,
  metadata?: Record<string, any> | null
) {
  const metadataString = stringifyMetadata(metadata);
  db.prepare(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ? AND type = ? AND IFNULL(metadata, '') = IFNULL(?, '')`
  ).run(userId, type, metadataString ?? null);
}

