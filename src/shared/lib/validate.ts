import { REGEX } from '../constants/regex';

/**
 * Validate email address
 * @example validateEmail('test@example.com') // true
 */
export function validateEmail(email: string): boolean {
  return REGEX.email.test(email);
}

/**
 * Validate phone number (10-11 digits)
 * @example validatePhone('0123456789') // true
 */
export function validatePhone(phone: string): boolean {
  return REGEX.phone.test(phone);
}

/**
 * Validate Vietnamese phone number
 * @example validateVietnamesePhone('0912345678') // true
 */
export function validateVietnamesePhone(phone: string): boolean {
  return REGEX.vietnamesePhone.test(phone);
}

/**
 * Validate URL
 * @example validateURL('https://example.com') // true
 */
export function validateURL(url: string): boolean {
  return REGEX.url.test(url);
}
