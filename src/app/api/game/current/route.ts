import { NextResponse } from 'next/server';
import { getCurrentPublicQuestion, getGameSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getGameSettings();
    const currentQuestion = getCurrentPublicQuestion();

    if (!currentQuestion) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active question found for the current round.',
        settings: {
          event_name: settings.event_name,
          timer_duration: settings.timer_duration,
          current_round: settings.current_round,
          total_rounds: settings.total_rounds,
          game_status: settings.game_status,
        },
      });
    }

    // ANTI-CHEAT: Ensure correct_option is NOT leaked
    const { ...safeQuestion } = currentQuestion;

    return NextResponse.json({
      success: true,
      data: safeQuestion,
      settings: {
        event_name: settings.event_name,
        timer_duration: settings.timer_duration,
        current_round: settings.current_round,
        current_question_index: settings.current_question_index,
        total_rounds: settings.total_rounds,
        auto_next: settings.auto_next,
        answer_reveal: settings.answer_reveal,
        game_status: settings.game_status,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current question:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve current question', error: error.message },
      { status: 500 }
    );
  }
}
