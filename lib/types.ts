export type Priority = 'low' | 'medium' | 'high';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Status {
  id: number;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
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
  title: string;
  content: string | null;
  category: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}
