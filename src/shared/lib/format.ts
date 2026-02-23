import { DATE_FORMATS, type DateFormat } from '../constants/date-formats';

/**
 * Format currency amount
 * @example formatCurrency(1000000, 'vi-VN', 'VND') // '1.000.000 ₫'
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en-US',
  currency: string = 'USD',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date using date-fns format or custom format
 * @example formatDate(new Date(), 'short') // '01/01/2024'
 */
export function formatDate(
  date: Date | string | number,
  format: DateFormat | string = 'short',
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  // If format is a key in DATE_FORMATS, use it
  if (format in DATE_FORMATS) {
    const formatStr = DATE_FORMATS[format as DateFormat];
    // Simple date formatting without date-fns dependency
    return formatDateString(dateObj, formatStr);
  }

  // Otherwise use as custom format string
  return formatDateString(dateObj, format);
}

function formatDateString(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return format
    .replace(/dd/g, day)
    .replace(/MM/g, month)
    .replace(/yyyy/g, year.toString())
    .replace(/MMMM/g, monthNames[date.getMonth()])
    .replace(/MMM/g, monthNames[date.getMonth()].substring(0, 3))
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

/**
 * Format phone number
 * @example formatPhoneNumber('0123456789') // '0123 456 789'
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Format file size in bytes to human readable format
 * @example formatFileSize(1024) // '1 KB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Truncate text with ellipsis
 * @example truncate('Hello World', 5) // 'Hello...'
 */
export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}
