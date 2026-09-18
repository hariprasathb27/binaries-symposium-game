import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { getGameSettings, updateGameSettings, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getGameSettings();
  return NextResponse.json(
    { success: true, data: settings },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await updateGameSettings(body);
    await logAudit('SETTINGS_UPDATED', `Game settings updated by ${session.email}: ${JSON.stringify(body)}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Settings updated successfully',
        data: updated,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
