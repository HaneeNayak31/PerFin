import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from '../../src/middleware/auth.middleware.js';

const SECRET = 'unit-test-secret-that-is-at-least-32-characters';

describe('JWT helpers', () => {
  it('round-trips the user id and email', () => {
    const token = signToken({ id: 42, email: 'a@b.co' });
    expect(verifyToken(token)).toEqual({ id: 42, email: 'a@b.co' });
  });

  it('rejects expired tokens', () => {
    const token = jwt.sign({ email: 'a@b.co', exp: Math.floor(Date.now() / 1000) - 10 }, SECRET, { subject: '42' });
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects tokens signed with another secret', () => {
    const token = jwt.sign({ email: 'a@b.co' }, 'some-other-secret-value-0123456789', { subject: '42' });
    expect(verifyToken(token)).toBeNull();
  });

  it('rejects unsigned ("alg: none") tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '42', email: 'a@b.co' })).toString('base64url');
    expect(verifyToken(`${header}.${payload}.`)).toBeNull();
  });

  it('rejects tokens with a non-numeric subject', () => {
    const token = jwt.sign({ email: 'a@b.co' }, SECRET, { subject: 'admin' });
    expect(verifyToken(token)).toBeNull();
  });
});
