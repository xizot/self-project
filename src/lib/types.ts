export type Priority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Status {
  id: number;
  user_id: number;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  project_id: number | null;
  title: string;
  description: string | null;
  status_id: number;
  priority: Priority;
  category: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  // For UI display, not directly in DB
  status?: Status;
  project?: Project | null;
}

// Legacy types (giữ lại để tương thích)
export type TodoStatus = 'todo' | 'in-progress' | 'done';

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  category: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanBoard {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanCard {
  id: number;
  board_id: number;
  title: string;
  description: string | null;
  status: TodoStatus;
  position: number;
  priority: Priority;
  todo_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string | null;
  category: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface App {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export type PasswordType = 'password' | 'webhook' | 'api_key' | 'token' | 'other';

export interface Password {
  id: number;
  user_id: number;
  app_name: string;
  type: PasswordType;
  username: string | null;
  email: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AutomationTaskType = 'http_request' | 'script';

export interface AutomationScript {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  path: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationTask {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  type: AutomationTaskType;
  config: string; // JSON string
  schedule: string; // Cron expression or interval
  enabled: number; // 0 or 1 (SQLite boolean)
  webhook_id: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}
