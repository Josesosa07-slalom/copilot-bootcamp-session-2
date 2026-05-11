import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ThemeProvider } from '@mui/material/styles';
import App from '../App';
import theme from '../theme';

// Mock server to intercept API requests
const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 1,
          title: 'Test Task 1',
          completed: false,
          dueDate: '2026-05-15',
          createdAt: '2026-05-11T10:00:00.000Z',
          updatedAt: '2026-05-11T10:00:00.000Z',
        },
        {
          id: 2,
          title: 'Test Task 2',
          completed: true,
          dueDate: null,
          createdAt: '2026-05-11T11:00:00.000Z',
          updatedAt: '2026-05-11T11:00:00.000Z',
        },
      ])
    );
  }),

  rest.post('/api/todos', (req, res, ctx) => {
    const { title, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Task title is required' })
      );
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

  rest.patch('/api/todos/:id', (req, res, ctx) => {
    const { title, completed, dueDate } = req.body;

    return res(
      ctx.status(200),
      ctx.json({
        id: Number(req.params.id),
        title: title || 'Updated Task',
        completed: typeof completed === 'boolean' ? completed : false,
        dueDate: dueDate === undefined ? null : dueDate,
        createdAt: '2026-05-11T10:00:00.000Z',
        updatedAt: new Date().toISOString(),
      })
    );
  }),

  rest.delete('/api/todos/:id', (req, res, ctx) => res(
    ctx.status(200),
    ctx.json({ message: 'Todo deleted successfully', id: Number(req.params.id) })
  ))
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
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  test('renders planner heading', async () => {
    await renderApp();

    expect(screen.getByRole('heading', { name: 'TODO Planner' })).toBeInTheDocument();
    expect(screen.getByText('Create, prioritize, and complete your tasks.')).toBeInTheDocument();
  });

  test('loads and displays tasks', async () => {
    await renderApp();

    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });
  });

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
  });

  test('handles API error', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    await renderApp();

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add your first task.')).toBeInTheDocument();
    });
  });
});