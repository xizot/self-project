import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { AutomationTask } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const automationTaskSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['http_request', 'script']).optional(),
  config: z.string().optional(),
  schedule: z.string().optional(),
  enabled: z.boolean().optional(),
  webhook_id: z.number().nullable().optional(),
});

// GET single automation task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const task = db
      .prepare('SELECT * FROM automation_tasks WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationTask | undefined;

    if (!task) {
      return NextResponse.json(
        { error: 'Automation task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching automation task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation task' },
      { status: 500 }
    );
  }
}

// PATCH update automation task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const validated = automationTaskSchema.parse(body);

    // Check if task exists and belongs to user
    const existing = db
      .prepare('SELECT * FROM automation_tasks WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationTask | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Automation task not found' },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push('name = ?');
      values.push(validated.name);
    }
    if (validated.description !== undefined) {
      updates.push('description = ?');
      values.push(validated.description);
    }
    if (validated.type !== undefined) {
      updates.push('type = ?');
      values.push(validated.type);
    }
    if (validated.config !== undefined) {
      updates.push('config = ?');
      values.push(validated.config);
    }
    if (validated.schedule !== undefined) {
      updates.push('schedule = ?');
      values.push(validated.schedule);
      // Recalculate next_run_at if schedule changed
      const nextRunAt = calculateNextRun(validated.schedule);
      updates.push('next_run_at = ?');
      values.push(nextRunAt);
    }
    if (validated.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(validated.enabled ? 1 : 0);

      // If disabling the task, clear next_run_at to stop scheduling
      if (!validated.enabled) {
        updates.push('next_run_at = NULL');
        console.log(`[Automation] Task ${id} disabled - clearing next_run_at`);
      } else {
        // If enabling the task, recalculate next_run_at if it's null
        const currentTask = db
          .prepare('SELECT schedule FROM automation_tasks WHERE id = ? AND user_id = ?')
          .get(parseInt(id), user.id) as { schedule: string } | undefined;
        if (currentTask) {
          const nextRunAt = calculateNextRun(currentTask.schedule);
          updates.push('next_run_at = ?');
          values.push(nextRunAt);
          console.log(`[Automation] Task ${id} enabled - setting next_run_at to ${nextRunAt}`);
        }
      }
    }
    if (validated.webhook_id !== undefined) {
      updates.push('webhook_id = ?');
      values.push(validated.webhook_id);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(parseInt(id), user.id);

    const stmt = db.prepare(`
      UPDATE automation_tasks
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(...values);

    const updated = db
      .prepare('SELECT * FROM automation_tasks WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationTask;

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error updating automation task:', error);
    return NextResponse.json(
      { error: 'Failed to update automation task' },
      { status: 500 }
    );
  }
}

// DELETE automation task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if task exists and belongs to user
    const existing = db
      .prepare('SELECT * FROM automation_tasks WHERE id = ? AND user_id = ?')
      .get(parseInt(id), user.id) as AutomationTask | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: 'Automation task not found' },
        { status: 404 }
      );
    }

    db.prepare('DELETE FROM automation_tasks WHERE id = ? AND user_id = ?').run(
      parseInt(id),
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting automation task:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation task' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run time
function calculateNextRun(schedule: string): string {
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

  const nextRun = new Date(now);
  nextRun.setHours(nextRun.getHours() + 1);
  return nextRun.toISOString();
}

