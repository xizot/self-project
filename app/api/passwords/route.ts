import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Password } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { encryptPassword, decryptPassword } from '@/lib/password-encryption';
import { z } from 'zod';

const passwordSchema = z.object({
  app_name: z.string().min(1, 'Tên ứng dụng là bắt buộc'),
  type: z.enum(['password', 'webhook', 'api_key', 'token', 'other']).optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

// GET all passwords
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    let query = 'SELECT * FROM passwords WHERE user_id = ?';
    const params: any[] = [user.id];

    if (search) {
      query += ' AND (app_name LIKE ? OR username LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY app_name ASC, created_at DESC';

    const passwords = db.prepare(query).all(...params) as Password[];

    // Decrypt passwords for display (only return decrypted version to client)
    const decryptedPasswords = passwords.map((pwd) => ({
      ...pwd,
      password: decryptPassword(pwd.password),
    }));

    return NextResponse.json(decryptedPasswords);
  } catch (error) {
    console.error('Error fetching passwords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passwords' },
      { status: 500 }
    );
  }
}

// POST create new password
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = passwordSchema.parse(body);

    // Encrypt password before storing
    const encryptedPassword = encryptPassword(validated.password);

    const stmt = db.prepare(`
      INSERT INTO passwords (user_id, app_name, type, username, password)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.app_name,
      validated.type || 'password',
      validated.username || null,
      encryptedPassword
    );

    const password = db
      .prepare('SELECT * FROM passwords WHERE id = ?')
      .get(result.lastInsertRowid) as Password;

    // Return decrypted password to client
    return NextResponse.json(
      {
        ...password,
        password: validated.password, // Return original password, not encrypted
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating password:', error);
    return NextResponse.json(
      { error: 'Failed to create password' },
      { status: 500 }
    );
  }
}

