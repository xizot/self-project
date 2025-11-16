import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';
import { cookies } from 'next/headers';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(validated.email);

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.password);

    // Create user
    const result = db
      .prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
      .run(validated.email, hashedPassword, validated.name || null);

    const userId = result.lastInsertRowid as number;

    // Initialize default data for new user
    db.exec(`
      INSERT INTO statuses (user_id, name, color, position) VALUES
        (${userId}, 'Todo', '#3b82f6', 0),
        (${userId}, 'In Progress', '#f59e0b', 1),
        (${userId}, 'Done', '#10b981', 2);
    `);

    db.exec(`
      INSERT INTO projects (user_id, name, description, color) VALUES
        (${userId}, 'Default Project', 'Dự án mặc định', '#6366f1');
    `);

    db.exec(`
      INSERT INTO categories (user_id, name, color, position) VALUES
        (${userId}, 'Công việc', '#3b82f6', 0),
        (${userId}, 'Cá nhân', '#10b981', 1),
        (${userId}, 'Học tập', '#f59e0b', 2);
    `);

    // Generate token
    const token = generateToken(userId);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    const user = db
      .prepare('SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?')
      .get(userId);

    return NextResponse.json(
      { user, token },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Không thể đăng ký' },
      { status: 500 }
    );
  }
}

