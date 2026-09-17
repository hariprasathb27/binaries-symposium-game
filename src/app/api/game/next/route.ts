import { NextResponse } from 'next/server';
import { getGameSettings, updateGameSettings, getQuestions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const settings = await getGameSettings();
    const roundQuestions = (await getQuestions(settings.current_round)).filter((q) => q.active);
    const nextIndex = settings.current_question_index + 1;

    if (nextIndex < roundQuestions.length) {
      // Advance to next question in same round
      const updated = await updateGameSettings({
        current_question_index: nextIndex,
        game_status: 'active',
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: `Advanced to Question ${nextIndex + 1}`,
      });
    } else {
      // Finished current round, check next round
      const nextRound = settings.current_round + 1;
      const nextRoundQuestions = (await getQuestions(nextRound)).filter((q) => q.active);

      if (nextRoundQuestions.length > 0 && nextRound <= settings.total_rounds) {
        const updated = await updateGameSettings({
          current_round: nextRound,
          current_question_index: 0,
          game_status: 'active',
        });
        return NextResponse.json({
          success: true,
          data: updated,
          message: `Advanced to Round ${nextRound}!`,
        });
      } else {
        // Quiz completed
        const updated = await updateGameSettings({
          game_status: 'completed',
        });
        return NextResponse.json({
          success: true,
          data: updated,
          message: 'Symposium Quiz Completed! Check the Winners tab.',
        });
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to advance question', error: error.message },
      { status: 500 }
    );
  }
}
