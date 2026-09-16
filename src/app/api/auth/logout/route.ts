import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  logAudit('ADMIN_LOGOUT', 'Admin logged out');
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
