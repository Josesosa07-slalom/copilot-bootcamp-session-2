import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import TaskList from '../TaskList';
import theme from '../../theme';

const sampleTasks = [
  {
    id: 1,
    title: 'Task with date',
    completed: false,
    dueDate: '2026-06-15',
  },
  {
    id: 2,
    title: 'Completed task',
    completed: true,
    dueDate: null,
  },
];

const renderList = (props = {}) => {
  const handlers = {
    onToggle: props.onToggle || jest.fn(),
    onDelete: props.onDelete || jest.fn(),
    onEdit: props.onEdit || jest.fn(),
  };
  const utils = render(
    <ThemeProvider theme={theme}>
      <TaskList
        tasks={props.tasks ?? sampleTasks}
        loading={props.loading}
        {...handlers}
      />
    </ThemeProvider>
  );
  return { ...utils, ...handlers };
};

describe('TaskList', () => {
  test('renders empty state message when no tasks', () => {
    renderList({ tasks: [] });

    expect(screen.getByText('No tasks yet. Add your first task.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Task list' })).not.toBeInTheDocument();
  });

  test('renders each task with its title and due-date label', () => {
    renderList();

    expect(screen.getByText('Task with date')).toBeInTheDocument();
    expect(screen.getByText('Due: 2026-06-15')).toBeInTheDocument();
    expect(screen.getByText('Completed task')).toBeInTheDocument();
    expect(screen.getByText('No due date')).toBeInTheDocument();
  });

  test('reflects completion state on the checkbox via aria-label', () => {
    renderList();

    expect(
      screen.getByRole('checkbox', { name: 'Mark Task with date as complete' })
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Mark Completed task as incomplete' })
    ).toBeChecked();
  });

  test('calls onToggle with the inverted completion value', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderList();

    await user.click(
      screen.getByRole('checkbox', { name: 'Mark Task with date as complete' })
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(1, true);

    await user.click(
      screen.getByRole('checkbox', { name: 'Mark Completed task as incomplete' })
    );

    expect(onToggle).toHaveBeenCalledWith(2, false);
  });

  test('calls onDelete with the task id', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderList();

    await user.click(screen.getByRole('button', { name: 'Delete Task with date' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  test('opens the edit dialog with current task values prefilled', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole('button', { name: 'Edit Task with date' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    expect(within(dialog).getByDisplayValue('Task with date')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('2026-06-15')).toBeInTheDocument();
  });

  test('saves edits and emits onEdit with updated values', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderList();

    await user.click(screen.getByRole('button', { name: 'Edit Task with date' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    const titleField = within(dialog).getByDisplayValue('Task with date');
    await user.clear(titleField);
    await user.type(titleField, 'Updated title');

    const dateField = within(dialog).getByDisplayValue('2026-06-15');
    fireEvent.change(dateField, { target: { value: '2026-07-20' } });

    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(1, {
      title: 'Updated title',
      dueDate: '2026-07-20',
    });
  });

  test('passes dueDate as null when the date is cleared in the edit dialog', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderList();

    await user.click(screen.getByRole('button', { name: 'Edit Task with date' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    fireEvent.change(within(dialog).getByDisplayValue('2026-06-15'), { target: { value: '' } });

    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(onEdit).toHaveBeenCalledWith(1, {
      title: 'Task with date',
      dueDate: null,
    });
  });

  test('Save button is disabled when title is empty in edit dialog', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderList();

    await user.click(screen.getByRole('button', { name: 'Edit Task with date' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    await user.clear(within(dialog).getByDisplayValue('Task with date'));

    const saveButton = within(dialog).getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    // user-event v14 throws on disabled-button clicks; use fireEvent for the no-op check
    fireEvent.click(saveButton);
    expect(onEdit).not.toHaveBeenCalled();
  });

  test('Cancel closes the dialog without emitting onEdit', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderList();

    await user.click(screen.getByRole('button', { name: 'Edit Task with date' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onEdit).not.toHaveBeenCalled();
  });

  test('disables interactive controls when loading', () => {
    renderList({ loading: true });

    expect(
      screen.getByRole('checkbox', { name: 'Mark Task with date as complete' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Task with date' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete Task with date' })).toBeDisabled();
  });
});
