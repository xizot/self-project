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
  -- Projects table (dùng chung cho todo và kanban)
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Statuses table (quản lý trạng thái với màu)
  CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Tasks table (dùng chung cho todo và kanban)
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
  CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
  CREATE INDEX IF NOT EXISTS idx_kanban_cards_board ON kanban_cards(board_id);
  CREATE INDEX IF NOT EXISTS idx_kanban_cards_status ON kanban_cards(status);
`);

// Migration: Add todo_id column if it doesn't exist
try {
  const tableInfo = db
    .prepare('PRAGMA table_info(kanban_cards)')
    .all() as Array<{ name: string }>;
  const hasTodoId = tableInfo.some((col) => col.name === 'todo_id');

  if (!hasTodoId) {
    db.exec(`ALTER TABLE kanban_cards ADD COLUMN todo_id INTEGER;`);
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_kanban_cards_todo ON kanban_cards(todo_id);`
    );
    console.log('Added todo_id column to kanban_cards');
  } else {
    // Column exists, ensure index exists
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_kanban_cards_todo ON kanban_cards(todo_id);`
    );
  }
} catch (error: any) {
  // Column might already exist or other error
  if (error?.message && !error.message.includes('duplicate column')) {
    console.log('Migration check for todo_id:', error);
  }
}

// Initialize default statuses if they don't exist
try {
  const statusCount = db
    .prepare('SELECT COUNT(*) as count FROM statuses')
    .get() as { count: number };
  if (statusCount.count === 0) {
    db.exec(`
      INSERT INTO statuses (name, color, position) VALUES
        ('Todo', '#3b82f6', 0),
        ('In Progress', '#f59e0b', 1),
        ('Done', '#10b981', 2);
    `);
    console.log('Initialized default statuses');
  }
} catch (error: any) {
  console.log('Error initializing statuses:', error);
}

// Initialize default project if it doesn't exist
try {
  const projectCount = db
    .prepare('SELECT COUNT(*) as count FROM projects')
    .get() as { count: number };
  if (projectCount.count === 0) {
    db.exec(`
      INSERT INTO projects (name, description, color) VALUES
        ('Default Project', 'Dự án mặc định', '#6366f1');
    `);
    console.log('Initialized default project');
  }
} catch (error: any) {
  console.log('Error initializing projects:', error);
}

export default db;
