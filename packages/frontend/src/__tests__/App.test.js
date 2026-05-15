import React, { act } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ThemeProvider } from '@mui/material/styles';
import App from '../App';
import theme from '../theme';

// Validate dates the same way the real backend does so the mock can't drift
// out of sync with production behavior (avoids "mock hallucination").
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

// Stateful in-memory store so that PATCH preserves existing fields when callers
// only send a subset (matching the real API contract).
let nextId = 1;
let store = new Map();

const seedStore = () => {
  store = new Map();
  nextId = 1;
  const seedItems = [
    {
      id: nextId++,
      title: 'Test Task 1',
      completed: false,
      dueDate: '2026-05-15',
      createdAt: '2026-05-11T10:00:00.000Z',
      updatedAt: '2026-05-11T10:00:00.000Z',
    },
    {
      id: nextId++,
      title: 'Test Task 2',
      completed: true,
      dueDate: null,
      createdAt: '2026-05-11T11:00:00.000Z',
      updatedAt: '2026-05-11T11:00:00.000Z',
    },
  ];
  seedItems.forEach((item) => store.set(item.id, item));
  nextId = 3;
};

const sortStore = () => Array.from(store.values()).sort((a, b) => {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (!a.dueDate && b.dueDate) return 1;
  if (a.dueDate && !b.dueDate) return -1;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return a.createdAt < b.createdAt ? -1 : 1;
});

// Mock server to intercept API requests. Mirrors the real validation behavior
// so passing tests provide real signal about production behavior.
const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => res(ctx.status(200), ctx.json(sortStore()))),

  rest.post('/api/todos', (req, res, ctx) => {
    const { title, dueDate } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    if (dueDate !== undefined && !isValidDateString(dueDate)) {
      return res(ctx.status(400), ctx.json({ error: 'Due date must be a valid date' }));
    }

    const now = new Date().toISOString();
    const created = {
      id: nextId++,
      title: title.trim(),
      completed: false,
      dueDate: dueDate === undefined ? null : dueDate,
      createdAt: now,
      updatedAt: now,
    };
    store.set(created.id, created);
    return res(ctx.status(201), ctx.json(created));
  }),

  rest.patch('/api/todos/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res(ctx.status(400), ctx.json({ error: 'Valid todo ID is required' }));
    }

    const existing = store.get(id);
    if (!existing) {
      return res(ctx.status(404), ctx.json({ error: 'Todo not found' }));
    }

    const { title, completed, dueDate } = req.body;

    const nextTitle = title !== undefined ? title : existing.title;
    const nextCompleted = completed !== undefined ? completed : existing.completed;
    const nextDueDate = dueDate !== undefined ? dueDate : existing.dueDate;

    if (typeof nextTitle !== 'string' || nextTitle.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }
    if (typeof nextCompleted !== 'boolean') {
      return res(ctx.status(400), ctx.json({ error: 'Completed must be a boolean value' }));
    }
    if (!isValidDateString(nextDueDate)) {
      return res(ctx.status(400), ctx.json({ error: 'Due date must be a valid date' }));
    }

    const updated = {
      ...existing,
      title: nextTitle.trim(),
      completed: nextCompleted,
      dueDate: nextDueDate,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return res(ctx.status(200), ctx.json(updated));
  }),

  rest.delete('/api/todos/:id', (req, res, ctx) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res(ctx.status(400), ctx.json({ error: 'Valid todo ID is required' }));
    }
    if (!store.has(id)) {
      return res(ctx.status(404), ctx.json({ error: 'Todo not found' }));
    }
    store.delete(id);
    return res(ctx.status(200), ctx.json({ message: 'Todo deleted successfully', id }));
  })
);

const renderApp = async () => {
  await act(async () => {
    render(
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    );
  })
};

// Setup and teardown for the mock server
beforeAll(() => server.listen());
beforeEach(() => seedStore());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  test('renders planner heading', async () => {
    await renderApp();

    expect(screen.getByRole('heading', { name: 'TODO Planner' })).toBeInTheDocument();
    expect(screen.getByText('Create, prioritize, and complete your tasks.')).toBeInTheDocument();
  });

  test('loads and displays tasks with correct completion state', async () => {
    await renderApp();

    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });

    // Verify completion state is reflected in the rendered checkboxes,
    // not just the text (avoids false positives where task data is wrong).
    expect(
      screen.getByRole('checkbox', { name: 'Mark Test Task 1 as complete' })
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Mark Test Task 2 as incomplete' })
    ).toBeChecked();

    // Due date / no-due-date secondary text
    expect(screen.getByText('Due: 2026-05-15')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  test('adds a new task and verifies its rendered properties', async () => {
    const user = userEvent.setup();

    await renderApp();

    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText(/Task title/);
    await act(async () => {
      await user.clear(input);
      await user.type(input, 'New Test Task');
    });

    const submitButton = screen.getByRole('button', { name: 'Add Task' });
    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('New Test Task')).toBeInTheDocument();
    });

    // Verify the new task is rendered as incomplete (default per requirements)
    const newCheckbox = screen.getByRole('checkbox', { name: 'Mark New Test Task as complete' });
    expect(newCheckbox).not.toBeChecked();

    // Verify the form input is cleared after a successful submission
    expect(screen.getByLabelText(/Task title/)).toHaveValue('');
  });

  test('does not submit a task when the title is empty', async () => {
    const user = userEvent.setup();
    await renderApp();
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: 'Add Task' });
    expect(submitButton).toBeDisabled();

    // user-event v14 throws when interacting with disabled elements; use fireEvent
    fireEvent.click(submitButton);

    // Original two tasks unchanged (no new task was added)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  });

  test('toggles a task between complete and incomplete', async () => {
    const user = userEvent.setup();
    await renderApp();

    const checkbox = await screen.findByRole('checkbox', { name: 'Mark Test Task 1 as complete' });
    expect(checkbox).not.toBeChecked();

    await act(async () => {
      await user.click(checkbox);
    });

    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'Mark Test Task 1 as incomplete' })
      ).toBeChecked();
    });
  });

  test('deletes a task and removes it from the list', async () => {
    const user = userEvent.setup();
    await renderApp();

    await screen.findByText('Test Task 1');

    const deleteButton = screen.getByRole('button', { name: 'Delete Test Task 1' });
    await act(async () => {
      await user.click(deleteButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Task 1')).not.toBeInTheDocument();
    });
    // Other tasks remain (use findByText to wait through the post-delete refetch loading state)
    expect(await screen.findByText('Test Task 2')).toBeInTheDocument();
  });

  test('shows generic error message on 500 fetch failure', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => res(ctx.status(500)))
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
    });
  });

  test.each([502, 503, 504])(
    'shows backend-unavailable message when create returns %i',
    async (status) => {
      const user = userEvent.setup();
      await renderApp();

      await waitFor(() => {
        expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
      });

      server.use(
        rest.post('/api/todos', (req, res, ctx) => res(ctx.status(status)))
      );

      const input = screen.getByLabelText(/Task title/);
      await act(async () => {
        await user.clear(input);
        await user.type(input, 'Will fail');
      });

      const submitButton = screen.getByRole('button', { name: 'Add Task' });
      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Backend service is unavailable/)).toBeInTheDocument();
      });
    }
  );

  test('surfaces API validation error when create fails with 400', async () => {
    const user = userEvent.setup();
    await renderApp();

    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });

    server.use(
      rest.post('/api/todos', (req, res, ctx) => res(
        ctx.status(400),
        ctx.json({ error: 'Due date must be a valid date' })
      ))
    );

    const input = screen.getByLabelText(/Task title/);
    await act(async () => {
      await user.clear(input);
      await user.type(input, 'Bad date task');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Add Task' }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Due date must be a valid date/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => res(ctx.status(200), ctx.json([])))
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task.')).toBeInTheDocument();
    });
  });
});