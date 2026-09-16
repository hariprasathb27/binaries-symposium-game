import { NextRequest, NextResponse } from 'next/server';
import { getDb, logAudit } from '@/lib/db';
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME, ensureDefaultAdmin } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please wait a minute.' },
        { status: 429 }
      );
    }

    ensureDefaultAdmin();

    const body = await req.json();
    const { email, password, securityCode } = body;

    // Check if security code is provided as alternative quick symposium login
    const adminSecurityCode = process.env.ADMIN_SECURITY_CODE || 'BINARIES2026';
    if (securityCode && securityCode === adminSecurityCode) {
      const token = await createSessionToken({
        id: 'admin_security_code',
        email: 'symposium_admin@binaries.com',
        role: 'admin',
      });

      logAudit('ADMIN_LOGIN_SECURITY_CODE', 'Admin logged in via security code');

      const res = NextResponse.json({
        success: true,
        message: 'Authentication successful',
        user: { email: 'symposium_admin@binaries.com', role: 'admin' },
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return res;
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as any;

    if (!user) {
      logAudit('LOGIN_FAILED', `Failed login attempt for email: ${email}`);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      logAudit('LOGIN_FAILED', `Invalid password for email: ${email}`);
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    db.prepare('UPDATE admin_users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);
    logAudit('ADMIN_LOGIN_SUCCESS', `Admin logged in: ${email}`);

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
