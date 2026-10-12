import { NextResponse } from 'next/server';
import { getAlliance, getChat, getSeason, joinAlliance, postChat } from '@/lib/server/onlineStore';
import { accountFromRequest } from '@/lib/server/session';
import { clientIp, hit, rules } from '@/lib/server/rateLimit';

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

  // Giu theo tai khoan (khong the IP) — nhieu nguoi chang cai router se khong
  // danh nhau o nha nhung van bi chan spam, con do nguoi di cafe van dung duoc.
  const rate = await hit('community', session.pilot.id, rules.write);
  if (!rate.ok) {
    return NextResponse.json({ error: `Qua nhieu lan thu. Thu lai sau ${rate.retryAfter} giay.` }, { status: 429 });
  }

  let json: Record<string, unknown> = {};
  try { json = (await request.json()) as Record<string, unknown>; } catch { /* join khong can body */ }

  if (typeof json.message === 'string' && json.message.trim()) {
    const result = await postChat(session.pilot, json.message.trim());
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });
    return NextResponse.json({ message: result.message }, { status: 201 });
  }
  if (json.join === true) {
    const result = await joinAlliance(session.pilot);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true, members: result.members });
  }
  return NextResponse.json({ error: 'Khong co thao tac nao duoc chon.' }, { status: 400 });
}
