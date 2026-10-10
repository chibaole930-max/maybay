import { NextResponse } from 'next/server';
import { changePassword, loginWithPassword, registerAccount } from '@/lib/server/onlineStore';
import { accountFromRequest, clearCookieHeader, logoutRequest, sessionCookieHeader } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/**
 * Tai khoan: dang ky / dang nhap / dang xuat / doi mat khau / xem phien hien tai.
 *
 * Dang ky:    POST { action: 'register', username, password, name }
 * Dang nhap:  POST { action: 'login', username, password }
 * Dang xuat:  POST { action: 'logout' }
 * Doi mat khau: POST { action: 'change-password', current, next }
 * Phien hien tai: GET
 *
 * Phien duoc giu bang cookie httpOnly nen sau khi dang nhap, cac trang tiep theo
 * tu co thong tin dang nhap ma khong can giu token o localStorage.
 */

type Action = 'register' | 'login' | 'logout' | 'change-password';
const ACTIONS: Action[] = ['register', 'login', 'logout', 'change-password'];

export async function GET(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ account: null });
  return NextResponse.json({ account: session.account });
}

export async function POST(request: Request) {
  let json: Record<string, unknown>;
  try {
    json = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 });
  }

  const action = String(json.action || 'login') as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Hanh dong khong hop le.' }, { status: 400 });
  }

  if (action === 'logout') {
    await logoutRequest(request);
    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': clearCookieHeader(request) } });
  }

  if (action === 'change-password') {
    const session = await accountFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Can dang nhap.' }, { status: 401 });
    const result = await changePassword(session.pilot, String(json.current || ''), String(json.next || ''));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'register') {
    const result = await registerAccount({
      username: String(json.username || ''),
      password: String(json.password || ''),
      name: String(json.name || ''),
    });
    if (!result.ok) return NextResponse.json({ error: result.error, field: result.field }, { status: result.field ? 400 : 409 });
    return NextResponse.json(
      { account: { id: result.pilot.id, code: result.pilot.code, name: result.pilot.name, username: result.pilot.username, createdAt: result.pilot.createdAt } },
      { status: 201, headers: { 'Set-Cookie': sessionCookieHeader(request, result.token) } },
    );
  }

  const result = await loginWithPassword({
    username: String(json.username || ''),
    password: String(json.password || ''),
  });
  if (!result.ok) return NextResponse.json({ error: result.error, field: result.field }, { status: 401 });
  return NextResponse.json(
    { account: { id: result.pilot.id, code: result.pilot.code, name: result.pilot.name, username: result.pilot.username, createdAt: result.pilot.createdAt } },
    { headers: { 'Set-Cookie': sessionCookieHeader(request, result.token) } },
  );
}
