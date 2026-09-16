import { NextResponse } from 'next/server';
import { getComponents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const components = getComponents().filter((c) => c.active);
    return NextResponse.json({
      success: true,
      data: components,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch components', error: error.message },
      { status: 500 }
    );
  }
}
