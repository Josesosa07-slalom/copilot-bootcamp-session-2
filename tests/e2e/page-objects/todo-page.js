const { expect } = require('@playwright/test');

class TodoPage {
  constructor(page) {
    this.page = page;
    this.addTaskButton = page.getByRole('button', { name: 'Add Task' });
    this.taskTitleInput = page.getByLabel('Task title').first();
    this.dueDateInput = page.getByLabel('Due date').first();
    this.taskList = page.getByLabel('Task list');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { name: 'TODO Planner' })).toBeVisible();
  }

  async addTask(title, dueDate = undefined) {
    await this.taskTitleInput.fill(title);

    if (typeof dueDate === 'string') {
      await this.dueDateInput.fill(dueDate);
    } else if (dueDate === null) {
      await this.dueDateInput.fill('');
    }

    await this.addTaskButton.click();
  }

  taskCheckbox(title) {
    return this.page.getByRole('checkbox', {
      name: `Mark ${title} as complete`,
    }).or(this.page.getByRole('checkbox', {
      name: `Mark ${title} as incomplete`,
    }));
  }

  editButton(title) {
    return this.page.getByRole('button', { name: `Edit ${title}` });
  }

  deleteButton(title) {
    return this.page.getByRole('button', { name: `Delete ${title}` });
  }

  async openEditDialog(title) {
    await this.editButton(title).click();
    await expect(this.page.getByRole('dialog', { name: 'Edit task' })).toBeVisible();
  }

  async saveEdit({ title, dueDate }) {
    const dialog = this.page.getByRole('dialog', { name: 'Edit task' });

    if (title !== undefined) {
      await dialog.getByLabel('Task title').fill(title);
    }

    if (dueDate !== undefined) {
      await dialog.getByLabel('Due date').fill(dueDate || '');
    }

    await dialog.getByRole('button', { name: 'Save' }).click();
  }

  async toggleTask(title) {
    await this.taskCheckbox(title).click();
  }

  async deleteTask(title) {
    await this.deleteButton(title).click();
  }

  async expectTaskVisible(title) {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();
  }

  async expectTaskNotVisible(title) {
    await expect(this.page.getByText(title, { exact: true })).not.toBeVisible();
  }

  async expectDueDateVisible(dueDate) {
    await expect(this.page.getByText(`Due: ${dueDate}`, { exact: true })).toBeVisible();
  }

  async getTaskTitlesInOrder() {
    const labels = await this.page
      .locator('[aria-label^="Mark "]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') || ''));

    return labels.map((label) => label.replace(/^Mark\s+/, '').replace(/\s+as\s+(complete|incomplete)$/i, ''));
  }
}

module.exports = { TodoPage };
