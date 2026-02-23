export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  totalMinutes: number;
  isOverdue: boolean;
  isUrgent: boolean; // < 1 hour
}

export function calculateTimeRemaining(dueDate: string | null): TimeRemaining | null {
  if (!dueDate) return null;

  const now = new Date();
  let due: Date;
  
  // If it's a date-only string (YYYY-MM-DD), set to end of day
  if (dueDate.length === 10) {
    due = new Date(dueDate);
    due.setHours(23, 59, 59, 999);
  } else if (dueDate.includes('T') && !dueDate.includes('Z') && !dueDate.includes('+') && !dueDate.endsWith('Z')) {
    // If it's a local datetime string (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm)
    // Parse it as local time (not UTC)
    const [datePart, timePart] = dueDate.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const timeComponents = timePart.split(':').map(Number);
    const hours = timeComponents[0] || 0;
    const minutes = timeComponents[1] || 0;
    const seconds = timeComponents[2] || 0;
    // Create date in local timezone
    due = new Date(year, month - 1, day, hours, minutes, seconds);
  } else {
    // ISO string with timezone (UTC) - parse normally
    due = new Date(dueDate);
  }

  const diffMs = due.getTime() - now.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  const isOverdue = totalMinutes < 0;
  const isUrgent = totalMinutes >= 0 && totalMinutes < 60;

  const absMinutes = Math.abs(totalMinutes);
  const days = Math.floor(absMinutes / (24 * 60));
  const hours = Math.floor((absMinutes % (24 * 60)) / 60);
  const minutes = absMinutes % 60;

  return {
    days,
    hours,
    minutes,
    totalMinutes,
    isOverdue,
    isUrgent,
  };
}

export function formatTimeRemaining(timeRemaining: TimeRemaining | null): string {
  if (!timeRemaining) return '';

  const { days, hours, minutes, isOverdue } = timeRemaining;

  // Format: ngày giờ phút
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`);

  if (isOverdue) {
    return `Quá hạn ${parts.join(' ')}`;
  }

  return parts.join(' ');
}

