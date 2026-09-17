import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { getWinners, createWinner, updateWinner, deleteWinner, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const winners = await getWinners();
  return NextResponse.json({ success: true, data: winners });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { position, team_name, participant_name, score, completion_time } = body;

    if (!team_name || !participant_name) {
      return NextResponse.json(
        { success: false, message: 'Team name and participant name are required.' },
        { status: 400 }
      );
    }

    const winner = await createWinner({
      position: Number(position) || 1,
      team_name: team_name.trim(),
      participant_name: participant_name.trim(),
      score: Number(score) || 0,
      completion_time: completion_time?.trim() || '00:00',
    });

    await logAudit('WINNER_CREATED', `Winner created: Position ${winner.position} - ${winner.team_name} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Winner added successfully',
      data: winner,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to add winner' },
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
      return NextResponse.json({ success: false, message: 'Winner ID is required.' }, { status: 400 });
    }

    const updated = await updateWinner(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Winner not found.' }, { status: 404 });
    }

    await logAudit('WINNER_UPDATED', `Winner updated: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Winner updated successfully',
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update winner' },
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
      return NextResponse.json({ success: false, message: 'Winner ID is required' }, { status: 400 });
    }

    const deleted = await deleteWinner(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Winner not found' }, { status: 404 });
    }

    await logAudit('WINNER_DELETED', `Winner deleted: ${id} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Winner deleted successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete winner' },
      { status: 500 }
    );
  }
}
