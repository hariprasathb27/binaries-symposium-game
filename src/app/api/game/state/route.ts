import { NextResponse } from 'next/server';
import { getGameSettings, getQuestions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getGameSettings();
    const [roundQuestionsRaw, allQuestionsRaw] = await Promise.all([
      getQuestions(settings.current_round),
      getQuestions(),
    ]);
    const roundQuestions = roundQuestionsRaw.filter((q) => q.active);
    const allQuestions = allQuestionsRaw.filter((q) => q.active);

    return NextResponse.json(
      {
        success: true,
        data: {
          settings,
          totalQuestionsInRound: roundQuestions.length,
          totalQuestionsOverall: allQuestions.length,
        },
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve game state', error: error.message },
      { status: 500 }
    );
  }
}
