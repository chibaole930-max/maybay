import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authPilot } from '@/lib/server/onlineStore';

export const dynamic = 'force-dynamic';

const Body = z.object({ code: z.string().max(12).optional().default(''), name: z.string().max(32).optional().default('Hãng mới') });

/** Đăng nhập bằng mã hãng (inviteCode). Không cần mật khẩu — phù hợp game casual trên hosting. */
export async function POST(request: Request) {
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 }); }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  const pilot = await authPilot(parsed.data.code.toUpperCase(), parsed.data.name);
  return NextResponse.json({ pilot: { code: pilot.code, name: pilot.name }, token: pilot.token });
}
