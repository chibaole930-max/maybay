import { NextResponse } from 'next/server';
import { ownProfile, pilotStatsFromSave, profileByCode } from '@/lib/server/profile';
import { accountFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/**
 * Ho so pilot + thanh tich.
 *
 * GET ?code=VNAxxxx  -> ho so cong khai cua nguoi choi khac (tra `null` khi khong tim thay)
 * GET               -> ho so cua chinh tai khoan dang dang nhap (401 neu chua dang nhap)
 * GET ?stats=1&code=VNAxxxx -> chi so rut gon (doi bay, duong bay) doc tu save cloud
 *
 * `?stats=1` doc save cua nguoi khac. Save la du lieu game phia client, khong chua
 * thong tin nhay (khong mat khau, khong token) — nhung client nen tu quyet dinh
 * co public save hay khong truoc khi goi.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const profile = await profileByCode(code);
    if (!profile) return NextResponse.json({ profile: null }, { status: 404 });

    if (searchParams.get('stats') === '1') {
      return NextResponse.json({ profile, stats: await pilotStatsFromSave(profile.pilot.code) });
    }
    return NextResponse.json({ profile });
  }

  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de xem ho so.' }, { status: 401 });
  return NextResponse.json({ profile: await ownProfile(session.pilot) });
}