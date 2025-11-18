import db from './db';

export interface HydrationSlot {
  time: string;
  amount: number;
  title: string;
  note: string;
}

export interface HydrationLog {
  slot_index: number;
  amount: number;
  confirmed_at: string;
}

export interface HydrationSettings {
  is_active: boolean;
  reminder_sound: string | null;
}

export const hydrationSchedule: HydrationSlot[] = [
  {
    time: '06:30',
    amount: 300,
    title: 'Ngay sau khi thức dậy',
    note: 'Kích hoạt hệ tiêu hoá và thải độc sau 7-8 giờ ngủ.',
  },
  {
    time: '08:30',
    amount: 250,
    title: 'Trước bữa sáng',
    note: 'Giúp cơ thể hấp thu khoáng chất tốt hơn.',
  },
  {
    time: '11:00',
    amount: 300,
    title: 'Giữa buổi sáng',
    note: 'Duy trì sự tỉnh táo và hỗ trợ tuần hoàn.',
  },
  {
    time: '12:30',
    amount: 250,
    title: '30 phút sau bữa trưa',
    note: 'Hỗ trợ tiêu hoá, tránh loãng dịch vị.',
  },
  {
    time: '15:00',
    amount: 300,
    title: 'Buổi chiều',
    note: 'Bổ sung nước khi năng lượng bắt đầu giảm.',
  },
  {
    time: '17:00',
    amount: 250,
    title: 'Trước khi tập thể dục / tan làm',
    note: 'Chuẩn bị cho các hoạt động cuối ngày.',
  },
  {
    time: '19:30',
    amount: 250,
    title: 'Sau bữa tối',
    note: 'Giúp quá trình trao đổi chất diễn ra trơn tru.',
  },
  {
    time: '21:30',
    amount: 200,
    title: '1 giờ trước khi ngủ',
    note: 'Giữ cơ thể đủ nước trong khi ngủ, tránh uống quá sát giờ ngủ.',
  },
];

export function getHydrationLogs(userId: number, date: string): HydrationLog[] {
  return db
    .prepare(
      `SELECT slot_index, amount, confirmed_at
       FROM hydration_logs
       WHERE user_id = ? AND date = ?
       ORDER BY slot_index`
    )
    .all(userId, date) as HydrationLog[];
}

export function confirmHydrationSlot(
  userId: number,
  date: string,
  slotIndex: number
) {
  const slot = hydrationSchedule[slotIndex];
  if (!slot) {
    throw new Error('Invalid slot index');
  }

  db.prepare(
    `INSERT INTO hydration_logs (user_id, date, slot_index, amount, confirmed_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, date, slot_index) DO UPDATE SET
       amount = excluded.amount,
       confirmed_at = datetime('now')`
  ).run(userId, date, slotIndex, slot.amount);

  return {
    slot_index: slotIndex,
    amount: slot.amount,
  };
}

export function getHydrationSettings(userId: number): HydrationSettings {
  const row = db
    .prepare(
      `SELECT is_active, reminder_sound FROM hydration_settings WHERE user_id = ?`
    )
    .get(userId) as { is_active: number; reminder_sound: string | null } | undefined;

  return {
    is_active: !!row?.is_active,
    reminder_sound: row?.reminder_sound || null,
  };
}

export function updateHydrationSettings(
  userId: number,
  isActive: boolean,
  reminderSound?: string | null
) {
  db.prepare(
    `INSERT INTO hydration_settings (user_id, is_active, reminder_sound, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       is_active = excluded.is_active,
       reminder_sound = COALESCE(excluded.reminder_sound, hydration_settings.reminder_sound),
       updated_at = datetime('now')`
  ).run(userId, isActive ? 1 : 0, reminderSound ?? null);

  return getHydrationSettings(userId);
}

export interface HydrationReportRow {
  date: string;
  total: number;
  slots_completed: number;
}

export function getHydrationReport(
  userId: number,
  startDate: string,
  endDate: string
): HydrationReportRow[] {
  return db
    .prepare(
      `SELECT date,
              SUM(amount) AS total,
              COUNT(*) AS slots_completed
       FROM hydration_logs
       WHERE user_id = ? AND date BETWEEN ? AND ?
       GROUP BY date
       ORDER BY date DESC`
    )
    .all(userId, startDate, endDate) as HydrationReportRow[];
}

