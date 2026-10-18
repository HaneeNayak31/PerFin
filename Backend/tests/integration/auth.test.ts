import jwt from 'jsonwebtoken';
import { app, db, request, resetDatabase, signedInAgent } from './helpers.js';

beforeEach(resetDatabase);

describe('registration', () => {
  it('creates a user, stores a bcrypt hash, and never returns it', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'Hanee@Example.com', password: 'password123', name: 'Hanee' })
      .expect(201);
    expect(res.body).toEqual({ id: expect.any(Number), email: 'hanee@example.com', name: 'Hanee' });
    expect(JSON.stringify(res.body)).not.toContain('password');

    const stored = await db.orm.public.User.where({ email: 'hanee@example.com' }).first();
    expect(stored?.passwordHash).not.toBe('password123');
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await request(app).post('/auth/register').send({ email: 'a@example.com', password: 'password123', name: 'A1' }).expect(201);
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'A@EXAMPLE.com', password: 'password456', name: 'A2' })
      .expect(409);
    expect(res.body.message).toBe('Email already registered');
  });

  it('validates input', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'nope', password: '123', name: '' }).expect(400);
    expect(res.body.details.length).toBeGreaterThanOrEqual(3);
  });
});

describe('login and sessions', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send({ email: 'u@example.com', password: 'password123', name: 'User' });
  });

  it('sets an httpOnly cookie and does not expose the token in the body', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'u@example.com', password: 'password123' }).expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/perfin_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(res.body).toEqual({ user: { id: expect.any(Number), email: 'u@example.com', name: 'User' } });
  });

  it('returns the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app).post('/auth/login').send({ email: 'u@example.com', password: 'wrong-pass' }).expect(401);
    const unknownEmail = await request(app).post('/auth/login').send({ email: 'x@example.com', password: 'password123' }).expect(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('protects routes and accepts the session cookie', async () => {
    await request(app).get('/accounts').expect(401);
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: 'u@example.com', password: 'password123' }).expect(200);
    await agent.get('/accounts').expect(200);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.email).toBe('u@example.com');
  });

  it('rejects invalid, tampered and expired tokens', async () => {
    const user = await db.orm.public.User.where({ email: 'u@example.com' }).first();
    const secret = process.env.JWT_SECRET as string;
    const expired = jwt.sign({ email: 'u@example.com', exp: Math.floor(Date.now() / 1000) - 60 }, secret, {
      subject: String(user?.id),
    });
    const forged = jwt.sign({ email: 'u@example.com' }, 'attacker-secret-attacker-secret-1234', { subject: String(user?.id) });

    for (const token of ['garbage', expired, forged]) {
      await request(app).get('/accounts').set('Cookie', `perfin_token=${token}`).expect(401);
      await request(app).get('/accounts').set('Authorization', `Bearer ${token}`).expect(401);
    }
  });

  it('logout clears the cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: 'u@example.com', password: 'password123' }).expect(200);
    const res = await agent.post('/auth/logout').expect(204);
    expect(String(res.headers['set-cookie'])).toMatch(/perfin_token=;/);
    await agent.get('/accounts').expect(401);
  });
});

describe('request safety', () => {
  it('blocks state-changing requests from untrusted origins (CSRF)', async () => {
    const { agent } = await signedInAgent();
    await agent.post('/accounts').set('Origin', 'https://evil.example').send({ name: 'X', type: 'cash', balance: '0' }).expect(403);
    await agent.post('/accounts').set('Origin', 'http://localhost:3000').send({ name: 'X', type: 'cash', balance: '0' }).expect(201);
  });

  it('only allows CORS for the configured frontend origin', async () => {
    const allowed = await request(app).options('/accounts').set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app).options('/accounts').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns JSON errors without stack traces', async () => {
    const { agent } = await signedInAgent();
    const res = await agent.post('/accounts').set('Content-Type', 'application/json').send('{bad json').expect(400);
    expect(res.body).toEqual({ statusCode: 400, error: 'Bad Request', message: 'Request body is not valid JSON' });
    const missing = await agent.get('/nope').expect(404);
    expect(missing.body.statusCode).toBe(404);
  });

  it('rejects oversized bodies', async () => {
    const { agent } = await signedInAgent();
    await agent.post('/categories').send({ name: 'x'.repeat(200_000), type: 'expense' }).expect(413);
  });
});
