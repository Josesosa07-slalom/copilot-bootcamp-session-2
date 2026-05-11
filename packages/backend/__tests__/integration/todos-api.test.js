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
  it('creates and lists todos with expected shape', async () => {
    const createResponse = await createTodo({ title: 'Write integration tests', dueDate: '2026-06-01' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toHaveProperty('id');
    expect(createResponse.body.title).toBe('Write integration tests');
    expect(createResponse.body.completed).toBe(false);
    expect(createResponse.body.dueDate).toBe('2026-06-01');
    expect(createResponse.body).toHaveProperty('createdAt');
    expect(createResponse.body).toHaveProperty('updatedAt');

    const listResponse = await request(app).get('/api/todos');

    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.length).toBe(1);
    expect(listResponse.body[0].title).toBe('Write integration tests');
  });

  it('rejects invalid create payloads', async () => {
    const missingTitle = await request(app)
      .post('/api/todos')
      .send({})
      .set('Accept', 'application/json');

    expect(missingTitle.status).toBe(400);
    expect(missingTitle.body.error).toBe('Task title is required');

    const invalidDate = await request(app)
      .post('/api/todos')
      .send({ title: 'Bad date task', dueDate: 'not-a-date' })
      .set('Accept', 'application/json');

    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body.error).toBe('Due date must be a valid date');
  });

  it('updates title, completion, and due date', async () => {
    const createResponse = await createTodo({ title: 'Old title', dueDate: '2026-07-01' });
    const todoId = createResponse.body.id;

    const patchResponse = await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'Updated title', completed: true, dueDate: null })
      .set('Accept', 'application/json');

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.title).toBe('Updated title');
    expect(patchResponse.body.completed).toBe(true);
    expect(patchResponse.body.dueDate).toBe(null);
  });

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
    expect(listResponse.status).toBe(200);

    const orderedTitles = listResponse.body.map((todo) => todo.title);
    expect(orderedTitles).toEqual(['Due date earlier', 'Due date later', 'No due date A']);
  });
});
