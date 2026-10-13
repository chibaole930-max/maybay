import { NextResponse } from 'next/server';
import { changePassword, createSession, loginWithPassword, registerAccount, revokeSessions } from '@/lib/server/onlineStore';
import { accountFromRequest, clearCookieHeader, logoutRequest, sessionCookieHeader } from '@/lib/server/session';
import { StorageUnavailableError } from '@/lib/server/kv';
import { clientIp, hit, rules } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Tai khoan mat khau tu quan (khong vendor).
 *
 * Dang ky:    POST { action: 'register', username, password, name }
 * Dang nhap:  POST { action: 'login', username, password }
 * Dang xuat:  POST { action: 'logout' }
 * Doi mat khau: POST { action: 'change-password', current, next }
 * Thu hoi phien: POST { action: 'revoke-sessions' }
 * GET                                        phien hien tai
 */

type Action = 'register' | 'login' | 'logout' | 'change-password' | 'revoke-sessions';
const ACTIONS: Action[] = ['register', 'login', 'logout', 'change-password', 'revoke-sessions'];

/** Dịch lỗi storage (chưa cấu hình KV trên hosting chỉ-đọc) ra thông báo người dùng đọc được. */
function failure(error: unknown, fallback: string) {
  if (error instanceof StorageUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  console.error('[auth]', error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

async function guard(request: Request, name: string, rule: { limit: number; windowSeconds: number }) {
  const rate = await hit(name, clientIp(request), rule);
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Qua nhieu lan thu. Thu lai sau ${rate.retryAfter} giay.` },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
    );
  }
  return null;
}

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
    const blocked = await guard(request, 'change-password', rules.changePassword);
    if (blocked) return blocked;
    try {
      const result = await changePassword(session.pilot, String(json.current || ''), String(json.next || ''));
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      // Moi phien cu vua bi bo hieu luc — cap cookie moi cho phien hien tai.
      const fresh = await createSession(session.pilot.id, result.sessionEpoch);
      return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookieHeader(request, fresh) } });
    } catch (error) {
      return failure(error, 'Doi mat khau that bai do loi may chu.');
    }
  }

  if (action === 'revoke-sessions') {
    const session = await accountFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Can dang nhap.' }, { status: 401 });
    const rate = await hit('revoke', session.pilot.id, rules.changePassword);
    if (!rate.ok) return NextResponse.json({ error: `Qua nhieu lan thu. Thu lai sau ${rate.retryAfter} giay.` }, { status: 429 });
    try {
      const result = await revokeSessions(session.pilot);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      const fresh = await createSession(session.pilot.id, result.sessionEpoch);
      return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookieHeader(request, fresh) } });
    } catch (error) {
      return failure(error, 'Thu hoi phien that bai do loi may chu.');
    }
  }

  if (action === 'register') {
    const blocked = await guard(request, 'register', rules.register);
    if (blocked) return blocked;
    try {
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
    } catch (error) {
      return failure(error, 'Dang ky that bai do loi may chu.');
    }
  }

  const blockedLogin = await guard(request, 'login', rules.login);
  if (blockedLogin) return blockedLogin;
  try {
    const result = await loginWithPassword({
      username: String(json.username || ''),
      password: String(json.password || ''),
    });
    if (!result.ok) return NextResponse.json({ error: result.error, field: result.field }, { status: 401 });
    return NextResponse.json(
      { account: { id: result.pilot.id, code: result.pilot.code, name: result.pilot.name, username: result.pilot.username, createdAt: result.pilot.createdAt } },
      { headers: { 'Set-Cookie': sessionCookieHeader(request, result.token) } },
    );
  } catch (error) {
    return failure(error, 'Dang nhap that bai do loi may chu.');
  }
}
