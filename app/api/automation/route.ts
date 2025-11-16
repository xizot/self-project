import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { AutomationTask } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const automationTaskSchema = z.object({
  name: z.string().min(1, 'Tên task là bắt buộc'),
  description: z.string().optional(),
  type: z.enum(['http_request', 'script']),
  config: z.string().min(1, 'Config là bắt buộc'),
  schedule: z.string().min(1, 'Lịch chạy là bắt buộc'),
  enabled: z.boolean().optional(),
  webhook_id: z.number().nullable().optional(),
});

// GET all automation tasks
export async function GET() {
  try {
    const user = await requireAuth();
    const tasks = db
      .prepare(
        'SELECT * FROM automation_tasks WHERE user_id = ? ORDER BY created_at DESC'
      )
      .all(user.id) as AutomationTask[];

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching automation tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation tasks' },
      { status: 500 }
    );
  }
}

// POST create new automation task
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = automationTaskSchema.parse(body);

    // Calculate next_run_at based on schedule (simple implementation)
    const nextRunAt = calculateNextRun(validated.schedule);

    const stmt = db.prepare(`
      INSERT INTO automation_tasks (user_id, name, description, type, config, schedule, enabled, webhook_id, next_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      user.id,
      validated.name,
      validated.description || null,
      validated.type,
      validated.config,
      validated.schedule,
      validated.enabled !== undefined ? (validated.enabled ? 1 : 0) : 1,
      validated.webhook_id || null,
      nextRunAt
    );

    const task = db
      .prepare('SELECT * FROM automation_tasks WHERE id = ?')
      .get(result.lastInsertRowid) as AutomationTask;

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error creating automation task:', error);
    return NextResponse.json(
      { error: 'Failed to create automation task' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run time
function calculateNextRun(schedule: string): string {
  // Simple implementation: if schedule is a cron expression, calculate next run
  // For now, just set to 1 hour from now for intervals like "1h", "30m", etc.
  // Or parse cron expression
  const now = new Date();

  // Check if it's an interval (e.g., "15s", "30s", "1h", "30m", "1d", "1w")
  const intervalMatch = schedule.match(/^(\d+)([smhdw])$/);
  if (intervalMatch) {
    const value = parseInt(intervalMatch[1]);
    const unit = intervalMatch[2];
    const nextRun = new Date(now);

    if (unit === 's') {
      nextRun.setSeconds(nextRun.getSeconds() + value);
    } else if (unit === 'm') {
      nextRun.setMinutes(nextRun.getMinutes() + value);
    } else if (unit === 'h') {
      nextRun.setHours(nextRun.getHours() + value);
    } else if (unit === 'd') {
      nextRun.setDate(nextRun.getDate() + value);
    } else if (unit === 'w') {
      nextRun.setDate(nextRun.getDate() + value * 7);
    }

    return nextRun.toISOString();
  }

  // Default: 1 hour from now
  const nextRun = new Date(now);
  nextRun.setHours(nextRun.getHours() + 1);
  return nextRun.toISOString();
}

