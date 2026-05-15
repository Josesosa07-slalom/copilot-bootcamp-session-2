const { test, expect, request } = require('@playwright/test');
const { TodoPage } = require('./page-objects/todo-page');

const API_URL = 'http://localhost:3030';

async function clearTodos() {
  const api = await request.newContext({ baseURL: API_URL });
  const listResponse = await api.get('/api/todos');
  const todos = await listResponse.json();

  for (const todo of todos) {
    await api.delete(`/api/todos/${todo.id}`);
  }

  await api.dispose();
}

test.describe('TODO workflows', () => {
  test.beforeEach(async () => {
    await clearTodos();
  });

  test('shows empty state when there are no tasks', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await expect(page.getByText('No tasks yet. Add your first task.')).toBeVisible();
  });

  test('adds a task with an optional due date', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await todoPage.addTask('Prepare sprint demo', '2026-06-01');

    await todoPage.expectTaskVisible('Prepare sprint demo');
    await todoPage.expectDueDateVisible('2026-06-01');
  });

  test('edits task title and due date', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await todoPage.addTask('Draft design doc', '2026-06-10');
    await todoPage.openEditDialog('Draft design doc');
    await todoPage.saveEdit({ title: 'Draft architecture doc', dueDate: '2026-06-12' });

    await todoPage.expectTaskVisible('Draft architecture doc');
    await todoPage.expectDueDateVisible('2026-06-12');
    await todoPage.expectTaskNotVisible('Draft design doc');
  });

  test('toggles complete and incomplete state', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await todoPage.addTask('Ship release notes');

    const checkbox = page.getByRole('checkbox', { name: 'Mark Ship release notes as complete' });
    await expect(checkbox).not.toBeChecked();

    await todoPage.toggleTask('Ship release notes');
    await expect(page.getByRole('checkbox', { name: 'Mark Ship release notes as incomplete' })).toBeChecked();

    await todoPage.toggleTask('Ship release notes');
    await expect(page.getByRole('checkbox', { name: 'Mark Ship release notes as complete' })).not.toBeChecked();
  });

  test('sorts tasks deterministically', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await todoPage.addTask('No due date task', null);
    await todoPage.addTask('Later due date task', '2026-08-20');
    await todoPage.addTask('Earlier due date task', '2026-06-20');

    await todoPage.toggleTask('No due date task');

    const taskOrder = await todoPage.getTaskTitlesInOrder();
    expect(taskOrder).toEqual([
      'Earlier due date task',
      'Later due date task',
      'No due date task',
    ]);
  });

  test('deletes a task', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await todoPage.addTask('Obsolete task');
    await todoPage.expectTaskVisible('Obsolete task');

    await todoPage.deleteTask('Obsolete task');

    await todoPage.expectTaskNotVisible('Obsolete task');
    await expect(page.getByText('No tasks yet. Add your first task.')).toBeVisible();
  });

  test('persists tasks across page reload', async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    await todoPage.addTask('Persisted task', '2026-06-15');
    await todoPage.expectTaskVisible('Persisted task');
    await todoPage.expectDueDateVisible('2026-06-15');

    // Toggle the task to verify completion state also persists
    await todoPage.toggleTask('Persisted task');
    await expect(
      page.getByRole('checkbox', { name: 'Mark Persisted task as incomplete' })
    ).toBeChecked();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'TODO Planner' })).toBeVisible();

    await todoPage.expectTaskVisible('Persisted task');
    await todoPage.expectDueDateVisible('2026-06-15');
    await expect(
      page.getByRole('checkbox', { name: 'Mark Persisted task as incomplete' })
    ).toBeChecked();
  });
});
