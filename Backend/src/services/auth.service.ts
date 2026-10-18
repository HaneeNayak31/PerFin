import bcrypt from 'bcrypt';
import { db } from '../prisma/db.js';
import { signToken } from '../middleware/auth.middleware.js';
import { conflict, isUniqueViolation, notFound, unauthorized } from '../utils/errors.js';
import type { LoginDto, RegisterDto } from '../validation/dtos.js';

const BCRYPT_ROUNDS = 12;

export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
}

// Compared against when the email is unknown, so a failed login takes the same
// time whether or not the account exists (prevents email enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password', BCRYPT_ROUNDS);

export async function register(input: RegisterDto): Promise<PublicUser> {
  const existing = await db.orm.public.User.select('id').where({ email: input.email }).first();
  if (existing) throw conflict('Email already registered');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    return await db.orm.public.User.select('id', 'email', 'name').create({
      email: input.email,
      passwordHash,
      name: input.name,
    });
  } catch (error) {
    // Two simultaneous sign-ups with the same email: the unique index decides.
    if (isUniqueViolation(error)) throw conflict('Email already registered');
    throw error;
  }
}

export async function login(input: LoginDto): Promise<{ token: string; user: PublicUser }> {
  const user = await db.orm.public.User.select('id', 'email', 'name', 'passwordHash')
    .where({ email: input.email })
    .first();

  const passwordValid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordValid) throw unauthorized('Invalid email or password');

  return {
    token: signToken({ id: user.id, email: user.email }),
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function getProfile(userId: number): Promise<PublicUser> {
  const user = await db.orm.public.User.select('id', 'email', 'name').where({ id: userId }).first();
  if (!user) throw notFound('User not found');
  return user;
}
