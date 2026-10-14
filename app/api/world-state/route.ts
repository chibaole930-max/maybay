import { NextResponse } from 'next/server';
import { presence, worldState } from '@/lib/server/onlineStore';

export const dynamic = 'force-dynamic';

/**
 * Client poll 60s/lần: nhu cầu toàn server + số người đang online thật.
 * Không dùng websocket nên chạy được trên shared hosting.
 */
export async function GET() {
  try {
    return NextResponse.json({ ...worldState(Date.now()), ...(await presence()) });
  } catch {
    // Kho online lỗi/không đọc được: trả phần sự kiện để game vẫn chạy bình thường.
    return NextResponse.json({ ...worldState(Date.now()), online: null, activeToday: null, total: null });
  }
}