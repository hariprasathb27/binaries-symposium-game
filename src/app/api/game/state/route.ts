import { NextResponse } from 'next/server';
import { getGameSettings, getQuestions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getGameSettings();
    const roundQuestions = getQuestions(settings.current_round).filter((q) => q.active);
    const allQuestions = getQuestions().filter((q) => q.active);

    return NextResponse.json({
      success: true,
      data: {
        settings,
        totalQuestionsInRound: roundQuestions.length,
        totalQuestionsOverall: allQuestions.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve game state', error: error.message },
      { status: 500 }
    );
  }
}
