import { NextResponse } from 'next/server';
import { getAlliance, getChat, getSeason, joinAlliance, postChat, verifyToken } from '@/lib/server/onlineStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') || 'alliance';
  if (kind === 'season') return NextResponse.json(await getSeason());
  if (kind === 'chat') {
    const since = Number(searchParams.get('since') || 0);
    return NextResponse.json({ messages: await getChat(Number.isFinite(since) ? since : 0) });
  }
  const { alliance, members } = await getAlliance();
  return NextResponse.json({ alliance: alliance ? { ...alliance, members } : null });
}

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const pilot = await verifyToken(token);
  if (!pilot) return NextResponse.json({ error: 'Chưa đăng nhập online.' }, { status: 401 });
  let json: Record<string, unknown> = {};
  try { json = (await request.json()) as Record<string, unknown>; } catch { /* join không cần body */ }
  if (typeof json.message === 'string' && json.message.trim()) {
    const msg = await postChat(pilot.name, json.message.trim());
    return NextResponse.json({ message: msg }, { status: 201 });
  }
  const members = await joinAlliance(pilot);
  return NextResponse.json({ ok: true, members });
}
