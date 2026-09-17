import { NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { resetGame, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await resetGame();
    await logAudit('GAME_RESET', `Game state was reset to Round 1, Question 0 by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Game state reset successfully to Round 1, Question 1.',
      data: settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to reset game' },
      { status: 500 }
    );
  }
}
