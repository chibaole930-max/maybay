import { NextResponse } from 'next/server';
import { worldState } from '@/lib/server/onlineStore';

export const dynamic = 'force-dynamic';

/** Client poll 60s/lần để nhận nhu cầu toàn server (không cần websocket, chạy được shared hosting). */
export async function GET() {
  return NextResponse.json(worldState(Date.now()));
}
