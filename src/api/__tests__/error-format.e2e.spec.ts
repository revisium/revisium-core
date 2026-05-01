import request from 'supertest';
import { getTestApp } from 'src/testing/e2e';

describe('REST error response format', () => {
  it('401 Unauthorized → JSON body, no HTML, no stack-trace leak', async () => {
    const app = await getTestApp();

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        emailOrUsername: 'admin',
        password: 'definitely-not-the-password',
      });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        message: 'Invalid credentials',
      }),
    );
    expect(res.text).not.toMatch(/<!DOCTYPE html>/);
    expect(res.text).not.toMatch(/at LoginHandler\.execute/);
    expect(res.text).not.toMatch(/\n\s*at\s+/);
  });

  it('404 unknown route → JSON body, not HTML', async () => {
    const app = await getTestApp();

    const res = await request(app.getHttpServer()).get(
      '/api/this-route-does-not-exist',
    );

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.statusCode).toBe(404);
    expect(res.text).not.toMatch(/<!DOCTYPE html>/);
  });

  it('GraphQL still wraps errors with extensions.code (filter dispatches by transport)', async () => {
    const app = await getTestApp();

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({ query: '{ me { id } }' });

    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].extensions?.code).toBe('UNAUTHENTICATED');
  });
});
