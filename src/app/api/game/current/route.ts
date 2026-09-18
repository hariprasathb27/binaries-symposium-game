import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentPublicQuestion,
  getGameSettings,
  getTeamCurrentPublicQuestion,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const participantId = req.nextUrl.searchParams.get('participant_id');
    const teamName = req.nextUrl.searchParams.get('team_name') || undefined;
    const participantName = req.nextUrl.searchParams.get('participant_name') || undefined;
    const settings = await getGameSettings();

    // 1. Per-team isolated question retrieval
    if (participantId) {
      const { question, session } = await getTeamCurrentPublicQuestion(
        participantId,
        teamName,
        participantName
      );

      if (!question) {
        return NextResponse.json({
          success: true,
          data: null,
          message:
            session.status === 'completed'
              ? 'Symposium Quiz Completed! Check the Winners tab.'
              : 'No active question found for the current round.',
          settings: {
            event_name: settings.event_name,
            timer_duration: settings.timer_duration,
            current_round: session.current_round,
            current_question_index: session.current_question_index,
            total_rounds: settings.total_rounds,
            auto_next: settings.auto_next,
            answer_reveal: settings.answer_reveal,
            game_status: session.status,
          },
        });
      }

      // ANTI-CHEAT: Ensure correct_option is NOT leaked
      const { ...safeQuestion } = question;

      return NextResponse.json({
        success: true,
        data: safeQuestion,
        settings: {
          event_name: settings.event_name,
          timer_duration: settings.timer_duration,
          current_round: session.current_round,
          current_question_index: session.current_question_index,
          total_rounds: settings.total_rounds,
          auto_next: settings.auto_next,
          answer_reveal: settings.answer_reveal,
          game_status: session.status,
        },
      });
    }

    // 2. Fallback to global settings (projector / admin display)
    const currentQuestion = await getCurrentPublicQuestion();

    if (!currentQuestion) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No active question found for the current round.',
        settings: {
          event_name: settings.event_name,
          timer_duration: settings.timer_duration,
          current_round: settings.current_round,
          current_question_index: settings.current_question_index,
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

