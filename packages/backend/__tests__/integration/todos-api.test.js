const request = require('supertest');
const { app, db, clearTodosForTests } = require('../../src/app');

const createTodo = async ({ title, dueDate = null, completed } = {}) => {
  const payload = { title: title || 'Sample Task' };

  if (dueDate !== undefined) {
    payload.dueDate = dueDate;
  }

  if (completed !== undefined) {
    payload.completed = completed;
  }

  return request(app)
    .post('/api/todos')
    .send(payload)
    .set('Accept', 'application/json');
};

afterEach(() => {
  clearTodosForTests();
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('Todo API integration', () => {
  describe('POST /api/todos', () => {
    it('creates and lists todos with expected shape', async () => {
      const createResponse = await createTodo({ title: 'Write integration tests', dueDate: '2026-06-01' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          title: 'Write integration tests',
          completed: false,
          dueDate: '2026-06-01',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );

      const listResponse = await request(app).get('/api/todos');

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0]).toEqual(
        expect.objectContaining({
          id: createResponse.body.id,
          title: 'Write integration tests',
          completed: false,
          dueDate: '2026-06-01',
        })
      );
    });

    it('creates a todo without a due date (dueDate is null)', async () => {
      const response = await createTodo({ title: 'No date task' });

      expect(response.status).toBe(201);
      expect(response.body.dueDate).toBeNull();
      expect(response.body.completed).toBe(false);
    });

    it('trims whitespace around the title before saving', async () => {
      const response = await createTodo({ title: '   Padded title   ' });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Padded title');
    });

    it('rejects missing title', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({})
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Task title is required' });
    });

    it('rejects empty string title', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: '' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task title is required');
    });

    it('rejects whitespace-only title', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: '    ' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task title is required');
    });

    it('rejects non-string title', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 12345 })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task title is required');
    });

    it('rejects invalid due date string', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Bad date task', dueDate: 'not-a-date' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Due date must be a valid date');
    });

    it('rejects empty string due date', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Bad date task', dueDate: '' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Due date must be a valid date');
    });

    it('accepts dueDate explicitly set to null', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'Null date task', dueDate: null })
        .set('Accept', 'application/json');

      expect(response.status).toBe(201);
      expect(response.body.dueDate).toBeNull();
    });
  });

  describe('PATCH /api/todos/:id', () => {
    it('updates title, completion, and due date together', async () => {
      const createResponse = await createTodo({ title: 'Old title', dueDate: '2026-07-01' });
      const todoId = createResponse.body.id;

      const patchResponse = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: 'Updated title', completed: true, dueDate: null })
        .set('Accept', 'application/json');

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body).toEqual(
        expect.objectContaining({
          id: todoId,
          title: 'Updated title',
          completed: true,
          dueDate: null,
        })
      );
    });

    it('preserves existing fields when only title is provided', async () => {
      const createResponse = await createTodo({ title: 'Original', dueDate: '2026-06-15' });
      const todoId = createResponse.body.id;

      const patchResponse = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ title: 'New title only' })
        .set('Accept', 'application/json');

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.title).toBe('New title only');
      expect(patchResponse.body.dueDate).toBe('2026-06-15');
      expect(patchResponse.body.completed).toBe(false);
    });

    it('preserves existing fields when only completed is provided', async () => {
      const createResponse = await createTodo({ title: 'Stays the same', dueDate: '2026-06-15' });
      const todoId = createResponse.body.id;

      const patchResponse = await request(app)
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true })
        .set('Accept', 'application/json');

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.title).toBe('Stays the same');
      expect(patchResponse.body.dueDate).toBe('2026-06-15');
      expect(patchResponse.body.completed).toBe(true);
    });

    it('returns 400 for invalid id format', async () => {
      const response = await request(app)
        .patch('/api/todos/not-a-number')
        .send({ title: 'whatever' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid todo ID is required');
    });

    it('returns 404 when updating a non-existent todo', async () => {
      const response = await request(app)
        .patch('/api/todos/999999')
        .send({ title: 'whatever' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Todo not found');
    });

    it('rejects empty title on update', async () => {
      const createResponse = await createTodo({ title: 'Original' });
      const response = await request(app)
        .patch(`/api/todos/${createResponse.body.id}`)
        .send({ title: '' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task title is required');
    });

    it('rejects whitespace-only title on update', async () => {
      const createResponse = await createTodo({ title: 'Original' });
      const response = await request(app)
        .patch(`/api/todos/${createResponse.body.id}`)
        .send({ title: '   ' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Task title is required');
    });

    it('rejects non-boolean completed value', async () => {
      const createResponse = await createTodo({ title: 'Original' });
      const response = await request(app)
        .patch(`/api/todos/${createResponse.body.id}`)
        .send({ completed: 'true' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Completed must be a boolean value');
    });

    it('rejects invalid date format on update', async () => {
      const createResponse = await createTodo({ title: 'Original' });
      const response = await request(app)
        .patch(`/api/todos/${createResponse.body.id}`)
        .send({ dueDate: 'not-a-date' })
        .set('Accept', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Due date must be a valid date');
    });

    it('allows clearing the due date by passing null', async () => {
      const createResponse = await createTodo({ title: 'Has date', dueDate: '2026-06-15' });
      const response = await request(app)
        .patch(`/api/todos/${createResponse.body.id}`)
        .send({ dueDate: null })
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.dueDate).toBeNull();
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('deletes an existing todo', async () => {
      const createResponse = await createTodo({ title: 'Delete me' });
      const todoId = createResponse.body.id;

      const deleteResponse = await request(app).delete(`/api/todos/${todoId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toEqual({ message: 'Todo deleted successfully', id: todoId });

      const listResponse = await request(app).get('/api/todos');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toEqual([]);
    });

    it('returns 400 for invalid id format', async () => {
      const response = await request(app).delete('/api/todos/not-a-number');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid todo ID is required');
    });

    it('returns 404 for non-existent todo', async () => {
      const response = await request(app).delete('/api/todos/999999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Todo not found');
    });

    it('does not affect other todos when deleting one', async () => {
      const first = await createTodo({ title: 'Keep me' });
      const second = await createTodo({ title: 'Delete me' });

      await request(app).delete(`/api/todos/${second.body.id}`);

      const listResponse = await request(app).get('/api/todos');
      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(first.body.id);
      expect(listResponse.body[0].title).toBe('Keep me');
    });
  });

  describe('GET /api/todos sorting', () => {
    it('returns deterministic ordering with completion status verified', async () => {
      const first = await createTodo({ title: 'No due date A' });
      const second = await createTodo({ title: 'Due date later', dueDate: '2026-09-10' });
      const third = await createTodo({ title: 'Due date earlier', dueDate: '2026-05-10' });

      await request(app)
        .patch(`/api/todos/${first.body.id}`)
        .send({ completed: true })
        .set('Accept', 'application/json');

      const listResponse = await request(app).get('/api/todos');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toHaveLength(3);

      // Verify both order AND each task's completion / dueDate to avoid phantom assertions
      expect(listResponse.body).toEqual([
        expect.objectContaining({
          id: third.body.id,
          title: 'Due date earlier',
          completed: false,
          dueDate: '2026-05-10',
        }),
        expect.objectContaining({
          id: second.body.id,
          title: 'Due date later',
          completed: false,
          dueDate: '2026-09-10',
        }),
        expect.objectContaining({
          id: first.body.id,
          title: 'No due date A',
          completed: true,
          dueDate: null,
        }),
      ]);
    });

    it('places incomplete tasks before completed tasks even with later due dates', async () => {
      const completedEarly = await createTodo({ title: 'Completed early', dueDate: '2026-01-01' });
      await createTodo({ title: 'Incomplete late', dueDate: '2026-12-31' });

      await request(app)
        .patch(`/api/todos/${completedEarly.body.id}`)
        .send({ completed: true })
        .set('Accept', 'application/json');

      const listResponse = await request(app).get('/api/todos');
      expect(listResponse.body.map((t) => t.title)).toEqual([
        'Incomplete late',
        'Completed early',
      ]);
    });

    it('breaks ties between same due date by created order', async () => {
      const a = await createTodo({ title: 'First created', dueDate: '2026-06-15' });
      // Wait > 1s so SQLite's CURRENT_TIMESTAMP (1s resolution) gives a distinct value
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const b = await createTodo({ title: 'Second created', dueDate: '2026-06-15' });

      const listResponse = await request(app).get('/api/todos');
      expect(listResponse.body.map((t) => t.id)).toEqual([a.body.id, b.body.id]);
    });

    it('returns an empty array when there are no todos', async () => {
      const listResponse = await request(app).get('/api/todos');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body).toEqual([]);
    });
  });
});
