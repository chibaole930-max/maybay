import { NextResponse } from 'next/server';
import { claimMission, dailyMissions, pruneExpiredDailyState, serverProgress } from '@/lib/server/missions';
import { accountFromRequest } from '@/lib/server/session';
import { hit, rules } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Nhiem vu hang ngay toan server.
 *
 * GET  -> bo nhiemvu cua tai khoan (401 neu chua dang nhap) + tien do chung cua server
 * POST -> nhan thuong { missionId }
 *
 * Xem `lib/server/missions.ts` de biet server tinh tien do theo cach nao.
 */

export async function GET(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de xem nhiem vu.' }, { status: 401 });

  // Don rac cong dem cua nhung ngay da qua. Chi lam khi that su co rac — doc
  // `vat:db` la thao tac dat tien nen khong chay o moi request.
  await pruneExpiredDailyState().catch(() => 0);

  const [missions, server] = await Promise.all([dailyMissions(session.pilot), serverProgress()]);
  return NextResponse.json({ ...missions, server });
}

export async function POST(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de nhan thuong.' }, { status: 401 });

  const rate = await hit('missions', session.pilot.id, rules.write);
  if (!rate.ok) return NextResponse.json({ error: `Qua nhieu lan thu. Thu lai sau ${rate.retryAfter} giay.` }, { status: 429 });

  let json: { missionId?: unknown };
  try {
    json = (await request.json()) as { missionId?: unknown };
  } catch {
    return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 });
  }
  if (typeof json.missionId !== 'string' || json.missionId.length > 40) {
    return NextResponse.json({ error: 'Thieu ma nhiem vu.' }, { status: 400 });
  }

  const result = await claimMission(session.pilot, json.missionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  const [missions, server] = await Promise.all([dailyMissions(session.pilot), serverProgress()]);
  return NextResponse.json({ ok: true, reward: result.reward, ...missions, server });
}