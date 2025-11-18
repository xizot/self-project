import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath =
  process.env.DATABASE_PATH || join(process.cwd(), 'data', 'app.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
} catch {
  // Directory might already exist
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Projects table (dùng chung cho todo và kanban)
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Statuses table (quản lý trạng thái với màu)
  CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  -- Categories table (quản lý danh mục cho tasks)
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  -- Tasks table (dùng chung cho todo và kanban)
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status_id INTEGER NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT,
    due_date TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE RESTRICT
  );

  -- Legacy tables (giữ lại để migration)
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    category TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kanban_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kanban_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    position INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    todo_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Apps table (danh sách các ứng dụng)
  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  -- Passwords table (quản lý mật khẩu của các app/website khác)
  CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    app_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'password',
    username TEXT,
    email TEXT,
    password TEXT NOT NULL,
    url TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Automation scripts table (quản lý các script automation)
  CREATE TABLE IF NOT EXISTS automation_scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
  );

  -- Automation tasks table (quản lý các task tự động)
  CREATE TABLE IF NOT EXISTS automation_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'http_request',
    config TEXT NOT NULL,
    schedule TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    webhook_id INTEGER,
    last_run_at TEXT,
    next_run_at TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (webhook_id) REFERENCES passwords(id) ON DELETE SET NULL
  );

  -- Hydration settings
  CREATE TABLE IF NOT EXISTS hydration_settings (
    user_id INTEGER PRIMARY KEY,
    is_active INTEGER NOT NULL DEFAULT 0,
    reminder_sound TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS hydration_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    slot_index INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date, slot_index)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
  CREATE INDEX IF NOT EXISTS idx_statuses_user ON statuses(user_id);
  CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_apps_user ON apps(user_id);
  CREATE INDEX IF NOT EXISTS idx_passwords_user ON passwords(user_id);
  CREATE INDEX IF NOT EXISTS idx_automation_scripts_user ON automation_scripts(user_id);
  CREATE INDEX IF NOT EXISTS idx_automation_tasks_user ON automation_tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_automation_tasks_enabled ON automation_tasks(enabled);
  CREATE INDEX IF NOT EXISTS idx_automation_tasks_next_run ON automation_tasks(next_run_at);
  CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
  CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON kanban_cards(board_id);
  CREATE INDEX IF NOT EXISTS idx_kanban_cards_status ON kanban_cards(status);
  CREATE INDEX IF NOT EXISTS idx_categories_position ON categories(position);
  CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date ON hydration_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
`);

// Migration: Add webhook_id column to automation_tasks if it doesn't exist
// This must run BEFORE any queries that select from automation_tasks
try {
  const automationTasksInfo = db
    .prepare('PRAGMA table_info(automation_tasks)')
    .all() as Array<{ name: string }>;
  const hasWebhookId = automationTasksInfo.some((col) => col.name === 'webhook_id');

  if (!hasWebhookId) {
    db.exec('ALTER TABLE automation_tasks ADD COLUMN webhook_id INTEGER');
    // Create index after adding column
    db.exec('CREATE INDEX IF NOT EXISTS idx_automation_tasks_webhook ON automation_tasks(webhook_id)');
    console.log('Added webhook_id column to automation_tasks');
  }
} catch (error) {
  // Table might not exist yet, that's okay
  console.log('Could not check/add webhook_id column:', error);
}

// Migration: Add user_id columns to existing tables
try {
  const tables = [
    { name: 'projects', hasColumn: false },
    { name: 'statuses', hasColumn: false },
    { name: 'categories', hasColumn: false },
    { name: 'tasks', hasColumn: false },
    { name: 'notes', hasColumn: false },
    { name: 'passwords', hasColumn: false },
    { name: 'automation_scripts', hasColumn: false },
    { name: 'automation_tasks', hasColumn: false },
  ];

  for (const table of tables) {
    const tableInfo = db
      .prepare(`PRAGMA table_info(${table.name})`)
      .all() as Array<{ name: string }>;
    const hasUserId = tableInfo.some((col) => col.name === 'user_id');

    if (!hasUserId) {
      // For existing data, we'll set user_id to NULL temporarily
      // In production, you'd want to migrate existing data to a default user
      db.exec(`ALTER TABLE ${table.name} ADD COLUMN user_id INTEGER;`);
      console.log(`Added user_id column to ${table.name}`);
    }
  }

  // Add todo_id column if it doesn't exist
  const kanbanCardsInfo = db
    .prepare('PRAGMA table_info(kanban_cards)')
    .all() as Array<{ name: string }>;
  const hasTodoId = kanbanCardsInfo.some((col) => col.name === 'todo_id');

  if (!hasTodoId) {
    db.exec(`ALTER TABLE kanban_cards ADD COLUMN todo_id INTEGER;`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_kanban_cards_todo ON kanban_cards(todo_id);`
    );
    console.log('Added todo_id column to kanban_cards');
  } else {
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_kanban_cards_todo ON kanban_cards(todo_id);`
    );
  }

  // Add type column to passwords table if it doesn't exist
  const passwordsInfo = db
    .prepare('PRAGMA table_info(passwords)')
    .all() as Array<{ name: string }>;
  const hasType = passwordsInfo.some((col) => col.name === 'type');

  if (!hasType) {
    db.exec(`ALTER TABLE passwords ADD COLUMN type TEXT NOT NULL DEFAULT 'password';`);
    console.log('Added type column to passwords');
  }
} catch (error: any) {
  if (error?.message && !error.message.includes('duplicate column')) {
    console.log('Migration check error:', error);
  }
}

// Migration: Seed default automation scripts for all users
// This will add built-in scripts (get-gold-price.js, get-jira-tasks.js) to all existing users
try {
  const defaultScripts = [
    {
      name: 'Lấy giá vàng PNJ',
      description: 'Script tự động lấy giá vàng từ trang PNJ (https://www.pnj.com.vn/site/gia-vang)',
      path: 'scripts/get-gold-price.js',
    },
    {
      name: 'Lấy Jira Tasks',
      description: 'Script tự động lấy các task được assign cho bạn trên Jira. Cần cấu hình credentials (Jira API token) trong Quản lý Mật khẩu.',
      path: 'scripts/get-jira-tasks.js',
    },
  ];

  // Get all users
  const users = db.prepare('SELECT id FROM users').all() as Array<{ id: number }>;

  for (const user of users) {
    for (const script of defaultScripts) {
      // Check if script already exists for this user (by path)
      const existing = db
        .prepare('SELECT id FROM automation_scripts WHERE user_id = ? AND path = ?')
        .get(user.id, script.path) as { id: number } | undefined;

      if (!existing) {
        // Insert script for this user
        db.prepare(
          `INSERT INTO automation_scripts (user_id, name, description, path, created_at, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).run(user.id, script.name, script.description, script.path);
      }
    }
  }

  if (users.length > 0) {
    console.log(`Seeded ${defaultScripts.length} default automation scripts for ${users.length} user(s)`);
  }
} catch (error: any) {
  if (error?.message && !error.message.includes('no such table')) {
    console.log('Error seeding automation scripts:', error);
  }
}

// Note: Default data initialization will be done per user when they register
// This ensures each user has their own default statuses, projects, and categories

export default db;
