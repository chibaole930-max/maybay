import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leaderboard, upsertPilot, verifyToken } from '@/lib/server/onlineStore';

export const dynamic = 'force-dynamic';

const Heartbeat = z.object({
  code: z.string().max(12), name: z.string().max(32),
  value: z.number().min(0).max(1e13), level: z.number().min(1).max(100),
  planes: z.number().min(0).max(500), routes: z.number().min(0).max(200),
  reputation: z.number().min(0).max(100),
});

/** GET: BXH thật. POST: heartbeat cập nhật giá trị hãng (gọi 60s/lần từ client). */
export async function GET() {
  const rows = await leaderboard(50);
  return NextResponse.json({ pilots: rows.map((p) => ({ code: p.code, name: p.name, value: p.value, level: p.level, planes: p.planes, routes: p.routes, reputation: p.reputation })) });
}

export async function POST(request: Request) {
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 }); }
  const parsed = Heartbeat.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const pilot = await upsertPilot(parsed.data);
  // Gắn token nếu client đã có (giữ phiên), nếu chưa trả token mới.
  if (token) { const existing = await verifyToken(token); if (existing) return NextResponse.json({ ok: true }); }
  return NextResponse.json({ ok: true, token: pilot.token });
}
