import { NextRequest, NextResponse } from 'next/server';
import { initOrResetTeamSession, getGameSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let participantId = 'participant_anonymous';
    let teamName: string | undefined = undefined;
    let participantName: string | undefined = undefined;

    try {
      const body = await req.json();
      if (body) {
        if (body.participant_id) participantId = body.participant_id;
        if (body.team_name) teamName = body.team_name;
        if (body.participant_name) participantName = body.participant_name;
      }
    } catch {
      // Empty or non-JSON body
    }

    const session = await initOrResetTeamSession(participantId, teamName, participantName);
    const settings = await getGameSettings();

    return NextResponse.json(
      {
        success: true,
        data: {
          session,
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
        },
        message: `Session initialized for team: ${session.team_name}`,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('Error starting team game session:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to start team game session', error: error.message },
      { status: 500 }
    );
  }
}
