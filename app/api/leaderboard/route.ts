import { NextResponse } from 'next/server';
import { z } from 'zod';
import { leaderboard, updatePilotStats } from '@/lib/server/onlineStore';
import { accountFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const Heartbeat = z.object({
  name: z.string().max(32).optional(),
  value: z.number().min(0).max(1e13),
  level: z.number().min(1).max(100),
  planes: z.number().min(0).max(500),
  routes: z.number().min(0).max(200),
  reputation: z.number().min(0).max(100),
});

/** GET: bang xep hang cong khai. POST: cap nhat chi so cho tai khoan dang dang nhap. */
export async function GET() {
  const rows = await leaderboard(50);
  return NextResponse.json({
    pilots: rows.map((p) => ({ code: p.code, name: p.name, value: p.value, level: p.level, planes: p.planes, routes: p.routes, reputation: p.reputation })),
  });
}

export async function POST(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de luu tien do.' }, { status: 401 });

  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 }); }
  const parsed = Heartbeat.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 });

  await updatePilotStats(session.pilot.id, parsed.data);
  return NextResponse.json({ ok: true, code: session.pilot.code });
}
