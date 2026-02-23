import db from './db';

// Get or create default "Todos" board
export function getDefaultTodosBoard() {
  let board = db
    .prepare('SELECT * FROM kanban_boards WHERE name = ?')
    .get('Todos') as any;

  if (!board) {
    const stmt = db.prepare(
      'INSERT INTO kanban_boards (name, description) VALUES (?, ?)'
    );
    const result = stmt.run('Todos', 'Board mặc định cho todos');
    board = db
      .prepare('SELECT * FROM kanban_boards WHERE id = ?')
      .get(result.lastInsertRowid) as any;
  }

  return board;
}

// Sync todo to kanban card
export function syncTodoToKanban(
  todoId: number,
  todo: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
  }
) {
  try {
    const board = getDefaultTodosBoard();

    // Check if card already exists
    const card = db
      .prepare('SELECT * FROM kanban_cards WHERE todo_id = ?')
      .get(todoId) as any;

    if (card) {
      // Update existing card
      const maxPos = db
        .prepare(
          `
        SELECT COALESCE(MAX(position), -1) as max_pos 
        FROM kanban_cards 
        WHERE board_id = ? AND status = ? AND id != ?
      `
        )
        .get(board.id, todo.status, card.id) as { max_pos: number };

      db.prepare(
        `
        UPDATE kanban_cards 
        SET title = ?, description = ?, status = ?, priority = ?, position = ?, updated_at = datetime('now')
        WHERE todo_id = ?
      `
      ).run(
        todo.title,
        todo.description || null,
        todo.status,
        todo.priority,
        maxPos.max_pos + 1,
        todoId
      );
    } else {
      // Create new card
      const maxPos = db
        .prepare(
          `
        SELECT COALESCE(MAX(position), -1) as max_pos 
        FROM kanban_cards 
        WHERE board_id = ? AND status = ?
      `
        )
        .get(board.id, todo.status) as { max_pos: number };

      db.prepare(
        `
        INSERT INTO kanban_cards (board_id, title, description, status, position, priority, todo_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        board.id,
        todo.title,
        todo.description || null,
        todo.status,
        maxPos.max_pos + 1,
        todo.priority,
        todoId
      );
    }
  } catch (error) {
    console.error('Error syncing todo to kanban:', error);
  }
}

// Sync kanban card to todo
export function syncKanbanToTodo(
  cardId: number,
  card: {
    title: string;
    description: string | null;
    status: string;
    priority: string;
  }
) {
  try {
    const cardData = db
      .prepare('SELECT * FROM kanban_cards WHERE id = ?')
      .get(cardId) as any;

    if (cardData && cardData.todo_id) {
      db.prepare(
        `
        UPDATE todos 
        SET title = ?, description = ?, status = ?, priority = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      ).run(
        card.title,
        card.description || null,
        card.status,
        card.priority,
        cardData.todo_id
      );
    }
  } catch (error) {
    console.error('Error syncing kanban to todo:', error);
  }
}

// Delete kanban card when todo is deleted
export function deleteKanbanCardByTodoId(todoId: number) {
  try {
    db.prepare('DELETE FROM kanban_cards WHERE todo_id = ?').run(todoId);
  } catch (error) {
    console.error('Error deleting kanban card:', error);
  }
}
