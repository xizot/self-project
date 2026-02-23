import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get nested object property by path string
 * @example get({ user: { name: 'John' } }, 'user.name') // 'John'
 */
export function get<T = unknown>(obj: unknown, path: string): T | undefined {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return undefined;
    }
    result = (result as Record<string, unknown>)[key];
  }

  return result as T;
}

/**
 * Check if value exists (not null, undefined, or empty string)
 */
export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }
  return true;
}
