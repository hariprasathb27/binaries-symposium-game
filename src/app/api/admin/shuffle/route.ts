import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { shuffleQuestions, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const mode = body.mode === 'round' ? 'round' : 'all';
    const roundNumber = body.roundNumber !== undefined ? Number(body.roundNumber) : undefined;

    const questions = await shuffleQuestions(mode, roundNumber);

    await logAudit('QUESTIONS_SHUFFLED', `Questions shuffled (mode: ${mode}, round: ${roundNumber ?? 'all'}) by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: mode === 'round' ? `Questions shuffled for Round ${roundNumber}` : 'All questions shuffled successfully',
      data: questions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to shuffle questions' },
      { status: 500 }
    );
  }
}
