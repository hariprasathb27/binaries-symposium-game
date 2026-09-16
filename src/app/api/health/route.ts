import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = getHealthStatus();
    return NextResponse.json({
      status: 'ok',
      service: 'binaries-symposium-api',
      timestamp: health.timestamp,
      database: 'connected (sqlite-native)',
      metrics: {
        questions: health.questionsCount,
        scientists: health.scientistsCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
