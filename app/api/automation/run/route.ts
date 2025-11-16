import { NextRequest, NextResponse } from 'next/server';
import { checkAndExecuteTasks, executeTask } from '@/lib/automation-worker';
import db from '@/lib/db';
import { AutomationTask } from '@/lib/types';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/automation/run
 * Manually trigger execution of all due tasks or a specific task
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const { taskId } = body;

    if (taskId) {
      // Execute specific task
      const task = db
        .prepare('SELECT * FROM automation_tasks WHERE id = ? AND user_id = ?')
        .get(parseInt(taskId), user.id) as AutomationTask | undefined;

      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }

      if (task.enabled === 0) {
        return NextResponse.json(
          { error: 'Task is disabled' },
          { status: 400 }
        );
      }

      const result = await executeTask(task);
      return NextResponse.json(result);
    } else {
      // Execute all due tasks
      await checkAndExecuteTasks();
      return NextResponse.json({ success: true, message: 'Tasks checked and executed' });
    }
  } catch (error: any) {
    console.error('Error running automation tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run automation tasks' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/automation/run
 * Check and execute tasks (can be called by cron)
 */
export async function GET() {
  try {
    await checkAndExecuteTasks();
    return NextResponse.json({ success: true, message: 'Tasks checked and executed' });
  } catch (error: any) {
    console.error('Error running automation tasks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run automation tasks' },
      { status: 500 }
    );
  }
}

