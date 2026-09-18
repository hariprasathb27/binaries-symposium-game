import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdminSession } from '@/lib/auth';
import { getWinners, updateWinner, deleteWinner, logAudit } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const winners = await getWinners();
  const winner = winners.find(
    (w) => w.id === id || w.id === `win_${id}` || w.id.replace(/^win_/, '') === id
  );

  if (!winner) {
    return NextResponse.json({ success: false, message: 'Winner not found' }, { status: 404 });
  }

  return NextResponse.json(
    { success: true, data: winner },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await updateWinner(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Winner not found' }, { status: 404 });
    }

    await logAudit('WINNER_UPDATED', `Winner updated via [id]: ${id} by ${session.email}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Winner updated successfully',
        data: updated,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update winner' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Winner ID is required' }, { status: 400 });
    }

    const deleted = await deleteWinner(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Winner not found' }, { status: 404 });
    }

    await logAudit('WINNER_DELETED', `Winner deleted via [id]: ${id} by ${session.email}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Winner deleted successfully',
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to delete winner' },
      { status: 500 }
    );
  }
}
