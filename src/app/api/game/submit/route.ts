import { NextRequest, NextResponse } from 'next/server';
import { verifyAnswer, getGameSettings } from '@/lib/db';
import { OptionKey } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`submit_${ip}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many submissions. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { question_id, selected_option, participant_id, submission_token } = body;

    if (!question_id) {
      return NextResponse.json(
        { success: false, message: 'Question ID is required' },
        { status: 400 }
      );
    }

    const validOptions: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];
    if (!selected_option || !validOptions.includes(selected_option)) {
      return NextResponse.json(
        { success: false, message: 'A valid option from A to E is required' },
        { status: 400 }
      );
    }

    const result = await verifyAnswer(
      question_id,
      selected_option,
      participant_id || 'participant_anonymous',
      submission_token
    );

    const settings = await getGameSettings();

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        answer_reveal: settings.answer_reveal,
        auto_next: settings.auto_next,
      },
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to evaluate answer' },
      { status: 500 }
    );
  }
}
