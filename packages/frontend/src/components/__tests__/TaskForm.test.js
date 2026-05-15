import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import TaskForm from '../TaskForm';
import theme from '../../theme';

const renderForm = (props = {}) => {
  const onCreate = props.onCreate || jest.fn();
  const utils = render(
    <ThemeProvider theme={theme}>
      <TaskForm onCreate={onCreate} loading={props.loading} />
    </ThemeProvider>
  );
  return { ...utils, onCreate };
};

const todayIso = () => new Date().toISOString().slice(0, 10);

describe('TaskForm', () => {
  test('renders title field, due date field, and submit button', () => {
    renderForm();

    expect(screen.getByLabelText(/Task title/)).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument();
  });

  test('defaults the due date input to today (current behavior)', () => {
    renderForm();
    expect(screen.getByLabelText('Due date')).toHaveValue(todayIso());
  });

  test('disables submit button when title is empty', () => {
    renderForm();
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeDisabled();
  });

  test('disables submit button when title contains only whitespace', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Task title/), '   ');

    expect(screen.getByRole('button', { name: 'Add Task' })).toBeDisabled();
  });

  test('enables submit when a non-empty title is entered', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Task title/), 'Hello');

    expect(screen.getByRole('button', { name: 'Add Task' })).toBeEnabled();
  });

  test('disables submit while loading even with a valid title', async () => {
    const user = userEvent.setup();
    renderForm({ loading: true });

    await user.type(screen.getByLabelText(/Task title/), 'Hello');

    expect(screen.getByRole('button', { name: 'Add Task' })).toBeDisabled();
  });

  test('calls onCreate with trimmed title and selected due date', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderForm();

    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-06-20' } });
    await user.type(screen.getByLabelText(/Task title/), '   Buy groceries   ');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledWith({
      title: 'Buy groceries',
      dueDate: '2026-06-20',
    });
  });

  test('falls back to today when due date is cleared before submit', async () => {
    const user = userEvent.setup();
    const { onCreate } = renderForm();

    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '' } });
    await user.type(screen.getByLabelText(/Task title/), 'No date task');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(onCreate).toHaveBeenCalledWith({
      title: 'No date task',
      dueDate: todayIso(),
    });
  });

  test('does not call onCreate when title is whitespace only and submit is forced', async () => {
    const user = userEvent.setup();
    const onCreate = jest.fn();
    renderForm({ onCreate });

    // Type whitespace, then press Enter to submit the form (button is disabled)
    const titleInput = screen.getByLabelText(/Task title/);
    await user.type(titleInput, '   {enter}');

    expect(onCreate).not.toHaveBeenCalled();
  });

  test('clears title and resets due date after a successful submit', async () => {
    const user = userEvent.setup();
    renderForm();

    const titleInput = screen.getByLabelText(/Task title/);
    const dueDateInput = screen.getByLabelText('Due date');

    fireEvent.change(dueDateInput, { target: { value: '2026-07-01' } });
    await user.type(titleInput, 'Reset me');
    await user.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(titleInput).toHaveValue('');
    expect(dueDateInput).toHaveValue(todayIso());
  });
});
