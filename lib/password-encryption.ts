import CryptoJS from 'crypto-js';

// Use a secret key from environment or default (in production, use a strong secret)
const SECRET_KEY = process.env.PASSWORD_ENCRYPTION_KEY || 'your-secret-key-change-in-production';

export function encryptPassword(password: string): string {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
}

export function decryptPassword(encryptedPassword: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

