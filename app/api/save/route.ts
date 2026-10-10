import { NextResponse } from 'next/server';
import { getCloudSave, putCloudSave } from '@/lib/server/onlineStore';
import { accountFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/**
 * Tien do game cua tung tai khoan.
 *
 * GET  -> ban luu tren may chu cua tai khoan dang dang nhap (401 neu chua dang nhap)
 * PUT  -> luu ban hien tai, { state: ... } (toi da ~256KB)
 *
 * Chien luoc giai quyet xung dot don gian: ai luu sau thi thang (last-write-wins),
 * kem `updatedAt` + `version` de client tu quyet dinh co ghi de ban local hay khong.
 */

const MAX_BODY = 256 * 1024;

export async function GET(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de tai tien do.' }, { status: 401 });
  const save = await getCloudSave(session.pilot.id);
  return NextResponse.json({ save });
}

export async function PUT(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de luu tien do.' }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'Ban luu qua lon.' }, { status: 413 });

  let json: { state?: unknown };
  try { json = JSON.parse(raw) as { state?: unknown }; } catch {
    return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 });
  }
  if (json.state === undefined || json.state === null) {
    return NextResponse.json({ error: 'Thieu truong state.' }, { status: 400 });
  }

  const save = await putCloudSave(session.pilot.id, json.state);
  return NextResponse.json({ updatedAt: save.updatedAt, version: save.version });
}
