import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { getQuestions, createQuestion, updateQuestion, deleteQuestion, logAudit, getScientistById } from '@/lib/db';
import { OptionKey } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const round = searchParams.get('round');
  const roundNum = round ? parseInt(round, 10) : undefined;

  const questions = getQuestions(roundNum);
  return NextResponse.json({ success: true, data: questions });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      scientist_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      option_e,
      correct_option,
      round_number,
      difficulty,
    } = body;

    // VALIDATION: Exactly 5 options required, scientist required, question text required, 1 correct option
    if (!scientist_id || !question_text) {
      return NextResponse.json(
        { success: false, message: 'Scientist and question text are required.' },
        { status: 400 }
      );
    }

    const scientist = getScientistById(scientist_id);
    if (!scientist) {
      return NextResponse.json(
        { success: false, message: 'Selected scientist does not exist.' },
        { status: 400 }
      );
    }

    if (!option_a || !option_b || !option_c || !option_d || !option_e) {
      return NextResponse.json(
        { success: false, message: 'All 5 answer options (A, B, C, D, E) must be provided and non-empty.' },
        { status: 400 }
      );
    }

    const validKeys: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];
    if (!correct_option || !validKeys.includes(correct_option)) {
      return NextResponse.json(
        { success: false, message: 'A valid single correct answer (A, B, C, D, or E) is required.' },
        { status: 400 }
      );
    }

    const newQuestion = createQuestion({
      scientist_id,
      question_text: question_text.trim(),
      option_a: option_a.trim(),
      option_b: option_b.trim(),
      option_c: option_c.trim(),
      option_d: option_d.trim(),
      option_e: option_e.trim(),
      correct_option,
      round_number: Number(round_number) || 1,
      difficulty: difficulty || 'medium',
      question_order: 0,
      active: true,
    });

    logAudit('QUESTION_CREATED', `Question created: ${newQuestion.id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to create question' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Question ID is required.' }, { status: 400 });
    }

    if (data.correct_option) {
      const validKeys: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];
      if (!validKeys.includes(data.correct_option)) {
        return NextResponse.json(
          { success: false, message: 'Correct option must be one of A, B, C, D, E.' },
          { status: 400 }
        );
      }
    }

    const updated = updateQuestion(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Question not found.' }, { status: 404 });
    }

    logAudit('QUESTION_UPDATED', `Question updated: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Question ID is required' }, { status: 400 });
    }

    const deleted = deleteQuestion(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Question not found or already deleted' }, { status: 404 });
    }

    logAudit('QUESTION_DELETED', `Question deleted: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete question' },
      { status: 500 }
    );
  }
}
