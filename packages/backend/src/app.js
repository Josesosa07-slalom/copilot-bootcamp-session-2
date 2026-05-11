const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'todos.db');

if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Initialize SQLite database (file-based by default for persistence)
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertTodoStmt = db.prepare(`
  INSERT INTO todos (title, due_date)
  VALUES (?, ?)
`);

const selectTodoByIdStmt = db.prepare('SELECT * FROM todos WHERE id = ?');

const selectSortedTodosStmt = db.prepare(`
  SELECT * FROM todos
  ORDER BY
    completed ASC,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
    due_date ASC,
    created_at ASC
`);

const deleteTodoByIdStmt = db.prepare('DELETE FROM todos WHERE id = ?');

const updateTodoStmt = db.prepare(`
  UPDATE todos
  SET
    title = @title,
    completed = @completed,
    due_date = @dueDate,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

const isValidDateString = (value) => {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }

  const date = new Date(trimmed);
  return !Number.isNaN(date.getTime());
};

const normalizeDueDate = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return String(value).trim().slice(0, 10);
};

const mapTodoRow = (row) => ({
  id: row.id,
  title: row.title,
  completed: Boolean(row.completed),
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseTodoId = (rawId) => {
  const parsedId = Number.parseInt(rawId, 10);
  return Number.isNaN(parsedId) ? null : parsedId;
};

const clearTodosForTests = () => {
  db.prepare('DELETE FROM todos').run();
};

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running' });
});

// API Routes
app.get('/api/todos', (req, res) => {
  try {
    const todos = selectSortedTodosStmt.all().map(mapTodoRow);
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', (req, res) => {
  try {
    const { title, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    if (dueDate !== undefined && !isValidDateString(dueDate)) {
      return res.status(400).json({ error: 'Due date must be a valid date' });
    }

    const normalizedDueDate = normalizeDueDate(dueDate);
    const result = insertTodoStmt.run(title.trim(), normalizedDueDate === undefined ? null : normalizedDueDate);
    const id = result.lastInsertRowid;

    const newTodo = selectTodoByIdStmt.get(id);
    res.status(201).json(mapTodoRow(newTodo));
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

const updateTodoHandler = (req, res) => {
  try {
    const todoId = parseTodoId(req.params.id);

    if (!todoId) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = selectTodoByIdStmt.get(todoId);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const nextTitle = req.body.title !== undefined ? req.body.title : existingTodo.title;
    const nextCompleted = req.body.completed !== undefined ? req.body.completed : Boolean(existingTodo.completed);
    const nextDueDateInput = req.body.dueDate !== undefined ? req.body.dueDate : existingTodo.due_date;

    if (typeof nextTitle !== 'string' || nextTitle.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    if (typeof nextCompleted !== 'boolean') {
      return res.status(400).json({ error: 'Completed must be a boolean value' });
    }

    if (!isValidDateString(nextDueDateInput)) {
      return res.status(400).json({ error: 'Due date must be a valid date' });
    }

    const normalizedDueDate = normalizeDueDate(nextDueDateInput);

    updateTodoStmt.run({
      id: todoId,
      title: nextTitle.trim(),
      completed: nextCompleted ? 1 : 0,
      dueDate: normalizedDueDate,
    });

    const updatedTodo = selectTodoByIdStmt.get(todoId);
    res.json(mapTodoRow(updatedTodo));
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
};

app.patch('/api/todos/:id', updateTodoHandler);

app.put('/api/todos/:id', (req, res) => {
  updateTodoHandler(req, res);
});

app.delete('/api/todos/:id', (req, res) => {
  try {
    const todoId = parseTodoId(req.params.id);

    if (!todoId) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = selectTodoByIdStmt.get(todoId);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const result = deleteTodoByIdStmt.run(todoId);

    if (result.changes > 0) {
      res.json({ message: 'Todo deleted successfully', id: todoId });
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

module.exports = { app, db, clearTodosForTests };