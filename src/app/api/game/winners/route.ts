import { NextResponse } from 'next/server';
import { getWinners } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const winners = await getWinners();
    return NextResponse.json({
      success: true,
      data: winners,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve winners', error: error.message },
      { status: 500 }
    );
  }
}
