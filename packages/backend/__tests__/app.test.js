const request = require('supertest');
const { app, db, clearTodosForTests } = require('../src/app');

afterEach(() => {
  clearTodosForTests();
});

afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('Backend health checks', () => {
  it('responds successfully on root route', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      message: 'Backend server is running',
    });
  });
});