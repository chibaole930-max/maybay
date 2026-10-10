import { NextResponse } from 'next/server';
import { getAlliance, getChat, getSeason, joinAlliance, postChat } from '@/lib/server/onlineStore';
import { accountFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') || 'alliance';
  if (kind === 'season') return NextResponse.json(await getSeason());
  if (kind === 'chat') {
    const raw = Number(searchParams.get('since') || 0);
    return NextResponse.json({ messages: await getChat(Number.isFinite(raw) ? raw : 0) });
  }
  const { alliance, members } = await getAlliance();
  return NextResponse.json({ alliance: alliance ? { ...alliance, members } : null });
}

export async function POST(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de thao tac.' }, { status: 401 });

  let json: Record<string, unknown> = {};
  try { json = (await request.json()) as Record<string, unknown>; } catch { /* join khong can body */ }

  if (typeof json.message === 'string' && json.message.trim()) {
    const msg = await postChat(session.pilot.name, json.message.trim());
    return NextResponse.json({ message: msg }, { status: 201 });
  }
  if (json.join === true) {
    const members = await joinAlliance(session.pilot);
    return NextResponse.json({ ok: true, members });
  }
  return NextResponse.json({ error: 'Khong co thao tac nao duoc chon.' }, { status: 400 });
}
