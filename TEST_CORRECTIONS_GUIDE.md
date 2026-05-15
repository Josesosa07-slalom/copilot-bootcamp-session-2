# Test Corrections Guide

This document provides specific code fixes for the issues identified in the test verification report.

---

## 1. FIX: Add Error Case Tests for PATCH Endpoint

**File**: `packages/backend/__tests__/integration/todos-api.test.js`

**Current Status**: Happy path only tested  
**Add These Tests**:

```javascript
describe('Todo PATCH - Error Cases', () => {
  it('rejects invalid todo ID', async () => {
    const response = await request(app)
      .patch('/api/todos/not-a-number')
      .send({ title: 'Updated' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Valid todo ID is required');
  });

  it('returns 404 for non-existent todo', async () => {
    const response = await request(app)
      .patch('/api/todos/9999')
      .send({ title: 'Updated' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });

  it('rejects empty title on update', async () => {
    const createResponse = await createTodo({ title: 'Original' });
    const todoId = createResponse.body.id;

    const response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ title: '' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Task title is required');
  });

  it('rejects title with only whitespace', async () => {
    const createResponse = await createTodo({ title: 'Original' });
    const todoId = createResponse.body.id;

    const response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ title: '   ' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Task title is required');
  });

  it('rejects non-boolean completed value', async () => {
    const createResponse = await createTodo({ title: 'Original' });
    const todoId = createResponse.body.id;

    // Test with string
    let response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ completed: 'true' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Completed must be a boolean value');

    // Test with number
    response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ completed: 1 })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Completed must be a boolean value');
  });

  it('rejects invalid date format on update', async () => {
    const createResponse = await createTodo({ title: 'Original' });
    const todoId = createResponse.body.id;

    const response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ dueDate: 'not-a-date' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Due date must be a valid date');
  });

  it('allows partial update of only title', async () => {
    const createResponse = await createTodo({ 
      title: 'Original', 
      dueDate: '2026-06-15',
      completed: false 
    });
    const todoId = createResponse.body.id;
    const originalDueDate = createResponse.body.dueDate;

    const response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'Updated Title' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Title');
    expect(response.body.dueDate).toBe(originalDueDate);  // ← Preserved
    expect(response.body.completed).toBe(false);           // ← Preserved
  });

  it('allows partial update of only dueDate', async () => {
    const createResponse = await createTodo({ 
      title: 'Original', 
      dueDate: '2026-06-15' 
    });
    const todoId = createResponse.body.id;
    const originalTitle = createResponse.body.title;

    const response = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ dueDate: '2026-07-20' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.title).toBe(originalTitle);      // ← Preserved
    expect(response.body.dueDate).toBe('2026-07-20');
    expect(response.body.completed).toBe(false);          // ← Preserved
  });
});
```

---

## 2. FIX: Add Error Case Tests for DELETE Endpoint

**File**: `packages/backend/__tests__/integration/todos-api.test.js`

```javascript
describe('Todo DELETE - Error Cases', () => {
  it('rejects invalid todo ID format', async () => {
    const response = await request(app)
      .delete('/api/todos/not-a-number')
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Valid todo ID is required');
  });

  it('returns 404 when deleting non-existent todo', async () => {
    const response = await request(app)
      .delete('/api/todos/9999')
      .set('Accept', 'application/json');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Todo not found');
  });

  it('rejects delete with negative ID', async () => {
    const response = await request(app)
      .delete('/api/todos/-1')
      .set('Accept', 'application/json');

    // Note: -1 will parse as valid number, might actually delete
    // This tests the edge case
    expect(response.status).toBeOneOf([400, 404]);
  });

  it('rejects delete with zero ID', async () => {
    const response = await request(app)
      .delete('/api/todos/0')
      .set('Accept', 'application/json');

    expect(response.status).toBeOneOf([400, 404]);
  });
});
```

---

## 3. FIX: Update POST Mock to Validate Dates

**File**: `packages/frontend/src/__tests__/App.test.js`

**Current**: 
```javascript
rest.post('/api/todos', (req, res, ctx) => {
  const { title, dueDate } = req.body;

  if (!title || title.trim() === '') {
    return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
  }

  return res(
    ctx.status(201),
    ctx.json({
      id: 3,
      title,
      dueDate: dueDate || null,  // ⚠️ No date validation
      // ...
    })
  );
})
```

**Corrected**:
```javascript
// Helper for isValidDateString to match backend
const isValidDateString = (value) => {
  if (value === null || value === undefined) {
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

const server = setupServer(
  // ... other handlers ...
  
  rest.post('/api/todos', (req, res, ctx) => {
    const { title, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    // ✅ Add date validation to match real API
    if (dueDate !== undefined && !isValidDateString(dueDate)) {
      return res(ctx.status(400), ctx.json({ error: 'Due date must be a valid date' }));
    }

    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        title,
        completed: false,
        dueDate: dueDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  }),
);
```

---

## 4. FIX: Update PATCH Mock to Preserve Fields

**File**: `packages/frontend/src/__tests__/App.test.js`

**Current**:
```javascript
rest.patch('/api/todos/:id', (req, res, ctx) => {
  const { title, completed, dueDate } = req.body;

  return res(
    ctx.status(200),
    ctx.json({
      id: Number(req.params.id),
      title: title || 'Updated Task',  // ⚠️ Sets fake default
      completed: typeof completed === 'boolean' ? completed : false,
      dueDate: dueDate === undefined ? null : dueDate,
      createdAt: '2026-05-11T10:00:00.000Z',
      updatedAt: new Date().toISOString(),
    })
  );
})
```

**Corrected**:
```javascript
// Need to maintain state in the mock to simulate real behavior
const mockTasksState = new Map([
  [1, {
    id: 1,
    title: 'Test Task 1',
    completed: false,
    dueDate: '2026-05-15',
    createdAt: '2026-05-11T10:00:00.000Z',
    updatedAt: '2026-05-11T10:00:00.000Z',
  }],
  [2, {
    id: 2,
    title: 'Test Task 2',
    completed: true,
    dueDate: null,
    createdAt: '2026-05-11T11:00:00.000Z',
    updatedAt: '2026-05-11T11:00:00.000Z',
  }],
]);

const server = setupServer(
  // ... other handlers ...
  
  rest.patch('/api/todos/:id', (req, res, ctx) => {
    const taskId = Number(req.params.id);
    const existingTask = mockTasksState.get(taskId);

    if (!existingTask) {
      return res(ctx.status(404), ctx.json({ error: 'Todo not found' }));
    }

    const { title, completed, dueDate } = req.body;

    // ✅ Preserve fields like real API does
    const updatedTask = {
      ...existingTask,
      id: taskId,
      title: title !== undefined ? title : existingTask.title,
      completed: typeof completed === 'boolean' ? completed : existingTask.completed,
      dueDate: dueDate !== undefined ? (dueDate || null) : existingTask.dueDate,
      updatedAt: new Date().toISOString(),
    };

    mockTasksState.set(taskId, updatedTask);

    return res(ctx.status(200), ctx.json(updatedTask));
  }),
);
```

---

## 5. FIX: Add Assertions for Task Creation Response

**File**: `packages/frontend/src/__tests__/App.test.js`

**Current Test**:
```javascript
test('adds a new task', async () => {
  const user = userEvent.setup();
  await renderApp();

  await waitFor(() => {
    expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
  });

  const input = screen.getByLabelText('Task title');
  await act(async () => {
    await user.type(input, 'New Test Task');
  });

  const submitButton = screen.getByRole('button', { name: 'Add Task' });
  await act(async () => {
    await user.click(submitButton);
  });

  await waitFor(() => {
    expect(screen.getByText('New Test Task')).toBeInTheDocument();
  });
  // ✗ Missing: No verification of actual response data
});
```

**Corrected**:
```javascript
test('adds a new task', async () => {
  const user = userEvent.setup();
  await renderApp();

  await waitFor(() => {
    expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
  });

  const input = screen.getByLabelText('Task title');
  const dateInput = screen.getByLabelText('Due date').first();
  
  await act(async () => {
    await user.type(input, 'New Test Task');
  });

  // ✅ Verify form has correct values before submit
  expect(input.value).toBe('New Test Task');

  const submitButton = screen.getByRole('button', { name: 'Add Task' });
  await act(async () => {
    await user.click(submitButton);
  });

  // ✅ Verify task appears in UI
  await waitFor(() => {
    expect(screen.getByText('New Test Task')).toBeInTheDocument();
  });

  // ✅ Verify task has correct properties
  const taskItems = screen.getAllByRole('checkbox');
  const newTaskCheckbox = taskItems[taskItems.length - 1]; // Last task should be new one
  
  expect(newTaskCheckbox).toHaveAttribute(
    'aria-label', 
    'Mark New Test Task as complete'
  );
  expect(newTaskCheckbox).not.toBeChecked(); // New tasks should be incomplete

  // ✅ Verify form reset after submission
  expect(input.value).toBe('');
});
```

---

## 6. FIX: Add Frontend Error Handling Tests

**File**: `packages/frontend/src/__tests__/App.test.js`

```javascript
describe('App Component - Error Handling', () => {
  test('handles 502 Bad Gateway with specific message', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(502));
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Backend service is unavailable/)).toBeInTheDocument();
    });
  });

  test('handles 503 Service Unavailable with specific message', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(503));
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Backend service is unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/port 3030/)).toBeInTheDocument();
    });
  });

  test('handles 504 Gateway Timeout with specific message', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(504));
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Backend service is unavailable/)).toBeInTheDocument();
    });
  });

  test('shows generic error message for other 4xx/5xx errors', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(418)); // I'm a teapot
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
    });
  });

  test('handles invalid JSON response', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.text('Invalid JSON'));
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
    });
  });
});
```

---

## 7. FIX: Update Sorting Test to Verify Completion Status

**File**: `packages/backend/__tests__/integration/todos-api.test.js`

**Current**:
```javascript
it('returns deterministic ordering', async () => {
  // ... create and modify tasks ...
  
  const listResponse = await request(app).get('/api/todos');
  const orderedTitles = listResponse.body.map((todo) => todo.title);
  expect(orderedTitles).toEqual(['Due date earlier', 'Due date later', 'No due date A']);
  // ✗ Doesn't verify completion status
});
```

**Corrected**:
```javascript
it('returns deterministic ordering', async () => {
  const first = await createTodo({ title: 'No due date A' });
  const second = await createTodo({ title: 'Due date later', dueDate: '2026-09-10' });
  const third = await createTodo({ title: 'Due date earlier', dueDate: '2026-05-10' });

  await request(app)
    .patch(`/api/todos/${first.body.id}`)
    .send({ completed: true })
    .set('Accept', 'application/json');

  await request(app)
    .patch(`/api/todos/${second.body.id}`)
    .send({ completed: false })
    .set('Accept', 'application/json');

  await request(app)
    .patch(`/api/todos/${third.body.id}`)
    .send({ completed: false })
    .set('Accept', 'application/json');

  const listResponse = await request(app).get('/api/todos');

  // ✅ Verify both title AND completion status
  expect(listResponse.body).toEqual([
    expect.objectContaining({
      title: 'Due date earlier',
      completed: false,
      dueDate: '2026-05-10',
    }),
    expect.objectContaining({
      title: 'Due date later',
      completed: false,
      dueDate: '2026-09-10',
    }),
    expect.objectContaining({
      title: 'No due date A',
      completed: true,
      dueDate: null,
    }),
  ]);
});
```

---

## 8. FIX: Add E2E Persistence Test

**File**: `tests/e2e/todo-workflow.spec.js`

```javascript
test('persists tasks across page reload', async ({ page }) => {
  const todoPage = new TodoPage(page);
  await todoPage.goto();

  // Create a task
  await todoPage.addTask('Persist me', '2026-06-15');
  await todoPage.expectTaskVisible('Persist me');
  await todoPage.expectDueDateVisible('2026-06-15');

  // Reload the page
  await page.reload();
  
  // Wait for page to load
  await expect(page.getByRole('heading', { name: 'TODO Planner' })).toBeVisible();

  // Verify task still exists
  await todoPage.expectTaskVisible('Persist me');
  await todoPage.expectDueDateVisible('2026-06-15');

  // Create second task after reload
  await todoPage.addTask('Second task', '2026-06-20');
  
  // Reload again
  await page.reload();
  await expect(page.getByRole('heading', { name: 'TODO Planner' })).toBeVisible();

  // Verify both tasks persisted
  await todoPage.expectTaskVisible('Persist me');
  await todoPage.expectTaskVisible('Second task');

  const taskOrder = await todoPage.getTaskTitlesInOrder();
  expect(taskOrder).toContain('Persist me');
  expect(taskOrder).toContain('Second task');
});
```

---

## 9. FIX: Add TaskForm Unit Tests

**File**: `packages/frontend/src/components/__tests__/TaskForm.test.js` (NEW)

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskForm from '../TaskForm';

describe('TaskForm Component', () => {
  it('renders form fields', () => {
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} />);

    expect(screen.getByLabelText('Task title')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument();
  });

  it('disables submit button when title is empty', () => {
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} />);

    const submitButton = screen.getByRole('button', { name: 'Add Task' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when title has content', async () => {
    const user = userEvent.setup();
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} />);

    const titleInput = screen.getByLabelText('Task title');
    const submitButton = screen.getByRole('button', { name: 'Add Task' });

    expect(submitButton).toBeDisabled();

    await user.type(titleInput, 'New task');

    expect(submitButton).not.toBeDisabled();
  });

  it('disables submit button when only whitespace entered', async () => {
    const user = userEvent.setup();
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} />);

    const titleInput = screen.getByLabelText('Task title');
    const submitButton = screen.getByRole('button', { name: 'Add Task' });

    await user.type(titleInput, '   ');

    expect(submitButton).toBeDisabled();
  });

  it('calls onCreate with title and dueDate', async () => {
    const user = userEvent.setup();
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} />);

    const titleInput = screen.getByLabelText('Task title');
    const dueDateInput = screen.getByLabelText('Due date');
    const submitButton = screen.getByRole('button', { name: 'Add Task' });

    await user.type(titleInput, 'Buy groceries');
    await user.type(dueDateInput, '2026-06-20');
    await user.click(submitButton);

    expect(mockOnCreate).toHaveBeenCalledWith({
      title: 'Buy groceries',
      dueDate: '2026-06-20',
    });
  });

  it('clears form after submission', async () => {
    const user = userEvent.setup();
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} />);

    const titleInput = screen.getByLabelText('Task title');
    const submitButton = screen.getByRole('button', { name: 'Add Task' });

    await user.type(titleInput, 'Test task');
    await user.click(submitButton);

    expect(titleInput.value).toBe('');
  });

  it('disables form when loading', () => {
    const mockOnCreate = jest.fn();
    render(<TaskForm onCreate={mockOnCreate} loading={true} />);

    const submitButton = screen.getByRole('button', { name: 'Add Task' });
    expect(submitButton).toBeDisabled();
  });
});
```

---

## 10. FIX: Add TaskList Unit Tests

**File**: `packages/frontend/src/components/__tests__/TaskList.test.js` (NEW)

```javascript
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskList from '../TaskList';

const mockTasks = [
  {
    id: 1,
    title: 'Task 1',
    completed: false,
    dueDate: '2026-06-15',
  },
  {
    id: 2,
    title: 'Task 2',
    completed: true,
    dueDate: null,
  },
];

describe('TaskList Component', () => {
  it('renders empty state when no tasks', () => {
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={[]} 
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText('No tasks yet. Add your first task.')).toBeInTheDocument();
  });

  it('renders task list with tasks', () => {
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={mockTasks}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Due: 2026-06-15')).toBeInTheDocument();
  });

  it('shows "No due date" for tasks without due date', () => {
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    const tasksWithoutDate = [
      {
        id: 1,
        title: 'No date task',
        completed: false,
        dueDate: null,
      },
    ];

    render(
      <TaskList 
        tasks={tasksWithoutDate}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  it('calls onToggle when checkbox clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={mockTasks}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Mark Task 1/ });
    await user.click(checkbox);

    expect(mockOnToggle).toHaveBeenCalledWith(1, true);
  });

  it('calls onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={mockTasks}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /Delete Task 1/ });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('opens edit dialog when edit button clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={mockTasks}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    const editButton = screen.getByRole('button', { name: /Edit Task 1/ });
    await user.click(editButton);

    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
  });

  it('saves edit when save button clicked', async () => {
    const user = userEvent.setup();
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={mockTasks}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
      />
    );

    const editButton = screen.getByRole('button', { name: /Edit Task 1/ });
    await user.click(editButton);

    const titleField = screen.getByDisplayValue('Task 1');
    await user.clear(titleField);
    await user.type(titleField, 'Updated Task 1');

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    expect(mockOnEdit).toHaveBeenCalledWith(1, {
      title: 'Updated Task 1',
      dueDate: '2026-06-15',
    });
  });

  it('disables buttons when loading', () => {
    const mockOnToggle = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnEdit = jest.fn();

    render(
      <TaskList 
        tasks={mockTasks}
        onToggle={mockOnToggle}
        onDelete={mockOnDelete}
        onEdit={mockOnEdit}
        loading={true}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: /Mark Task 1/ });
    const deleteButton = screen.getByRole('button', { name: /Delete Task 1/ });
    const editButton = screen.getByRole('button', { name: /Edit Task 1/ });

    expect(checkbox).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(editButton).toBeDisabled();
  });
});
```

---

## Summary of Fixes

| Issue | Fix | Test File | Priority |
|-------|-----|-----------|----------|
| Missing PATCH error tests | Add 8 new error case tests | todos-api.test.js | P1 |
| Missing DELETE error tests | Add 4 new error case tests | todos-api.test.js | P1 |
| Invalid POST mock date validation | Add isValidDateString check | App.test.js | P1 |
| Invalid PATCH mock field preservation | Rewrite mock with state management | App.test.js | P1 |
| Weak task creation assertions | Add response property verification | App.test.js | P1 |
| Missing error handling tests | Add 502/503/504 tests | App.test.js | P2 |
| Incomplete sorting test | Add completion status verification | todos-api.test.js | P2 |
| No E2E persistence test | Add page reload test | todo-workflow.spec.js | P2 |
| No TaskForm unit tests | Create new test file | TaskForm.test.js | P2 |
| No TaskList unit tests | Create new test file | TaskList.test.js | P2 |

