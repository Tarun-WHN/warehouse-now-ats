import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'whn_session';

// Resolved lazily (at request time, not module load) so production builds
// that lack the env var can still collect page data without throwing.
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET environment variable is required in production (min 16 chars). ' +
      'On Render this is auto-generated via render.yaml.'
    );
  }
  // Development-only fallback. Never used in production.
  return 'whn-ats-dev-only-secret-do-not-use-in-production';
}

// ─── Password Hashing ───

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
}

// ─── Session Token (HMAC-signed JSON) ───

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string; // TeamRole or 'Candidate'
  type: 'team' | 'candidate';
  exp: number; // expiration timestamp
}

function sign(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verify(token: string): SessionPayload | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;
    const expected = crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Cookie Management ───

export async function createSession(user: Omit<SessionPayload, 'exp'>): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const token = sign(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// For middleware (can't use async cookies() in middleware)
export function verifyToken(token: string): SessionPayload | null {
  return verify(token);
}

export const COOKIE_KEY = COOKIE_NAME;
