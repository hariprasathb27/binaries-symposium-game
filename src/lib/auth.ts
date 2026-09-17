import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAdminUserByEmail, insertAdminUser, isFirestoreProvider } from './db';

const SESSION_COOKIE_NAME = 'binaries_admin_session';
const SESSION_SECRET_STRING = process.env.SESSION_SECRET || 'binaries_default_super_secure_key_2026_symposium_quiz';
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET_STRING);

// -------------------------------------------------------------
// PASSWORD HASHING (scrypt + random salt)
// -------------------------------------------------------------
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, chosenSalt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt: chosenSalt,
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(hash, 'hex');
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

// -------------------------------------------------------------
// JWT SESSION TOKENS
// -------------------------------------------------------------
export async function createSessionToken(payload: { id: string; email: string; role: string }): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// SERVER-SIDE COOKIE AUTHENTICATION HELPER
// -------------------------------------------------------------
export async function getCurrentAdminSession(): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };

// -------------------------------------------------------------
// INITIALIZE DEFAULT ADMIN USER (SQLITE DEVELOPMENT ONLY)
// -------------------------------------------------------------
export async function ensureDefaultAdmin(): Promise<void> {
  if (isFirestoreProvider()) {
    // In Firestore mode, do NOT auto-seed on startup or request.
    // Use `npm run db:seed:firestore` instead.
    return;
  }

  const defaultEmail = process.env.ADMIN_EMAIL || 'admin@binaries.com';
  const defaultPass = process.env.ADMIN_PASSWORD || 'BinariesAdmin2026!';

  const existing = await getAdminUserByEmail(defaultEmail);
  if (!existing) {
    const { hash, salt } = hashPassword(defaultPass);
    const id = 'admin_root';
    const now = new Date().toISOString();
    await insertAdminUser({
      id,
      email: defaultEmail,
      password_hash: hash,
      salt,
      role: 'superadmin',
      created_at: now,
    });
  }
}

