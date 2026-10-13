import { NextResponse } from 'next/server';
import { createSession, revokeSessions, syncFirebaseIdentity } from '@/lib/server/onlineStore';
import { accountFromRequest, clearCookieHeader, logoutRequest, sessionCookieHeader } from '@/lib/server/session';
import { StorageUnavailableError } from '@/lib/server/kv';
import { FirebaseAuthError, FirebaseNotConfiguredError, firebaseReady, verifyIdToken } from '@/lib/server/firebaseAuth';
import { clientIp, hit, rules } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Tai khoan, xac thuc bang Firebase.
 *
 * POST { action: 'session', idToken, name? }  doi ID token -> phien cookie httpOnly
 * POST { action: 'revoke-sessions' }          thu hoi moi phien cu (dung sau khi doi mat khau)
 * POST { action: 'logout' }                   xoa phien
 * GET                                        phien hien tai
 *
 * Voi co che nay, mat khau **khong bao gio cham den may chu**: client xac thuc
 * voi Firebase, chi gui len mot ID token da ky. May chu xac chu ky roi cap cookie
 * httpOwn roi — nen JS trong trang doc khong duoc, chan XSS lay trom, y het phien
 * dang nhap cu ma truoc do.
 */

type Action = 'session' | 'logout' | 'revoke-sessions';
const ACTIONS: Action[] = ['session', 'logout', 'revoke-sessions'];

/** Dịch lỗi storage (chưa cấu hình KV trên hosting chỉ-đọc) ra thông báo người dùng đọc được. */
function failure(error: unknown, fallback: string) {
  if (error instanceof StorageUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof FirebaseNotConfiguredError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof FirebaseAuthError) {
    // 401: token hỏng/hết hạn — client đăng nhập lại được, không phải lỗi máy chủ.
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  console.error('[auth]', error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: Request) {
  if (!firebaseReady()) return NextResponse.json({ account: null });
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

  const action = String(json.action || 'session') as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Hanh dong khong hop le.' }, { status: 400 });
  }

  if (action === 'logout') {
    await logoutRequest(request);
    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': clearCookieHeader(request) } });
  }

  if (!firebaseReady()) {
    return NextResponse.json({ error: 'Máy chủ chưa cấu hình Firebase. Thêm FIREBASE_PROJECT_ID vào .env.local rồi khởi động lại.' }, { status: 503 });
  }

  if (action === 'revoke-sessions') {
    const session = await accountFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Can dang nhap.' }, { status: 401 });
    const rate = await hit('revoke', session.pilot.id, rules.changePassword);
    if (!rate.ok) return NextResponse.json({ error: `Qua nhieu lan thu. Thu lai sau ${rate.retryAfter} giay.` }, { status: 429 });
    try {
      const result = await revokeSessions(session.pilot);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      // Tăng `authEpoch` làm chính cookie đang cầm cũng hết hiệu lực, nên phải
      // cấp lại phiên mới — nếu không người dùng bị đá ra khỏi game.
      const fresh = await createSession(session.pilot.id, result.sessionEpoch);
      return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookieHeader(request, fresh) } });
    } catch (error) {
      return failure(error, 'Thu hoi phien that bai do loi may chu.');
    }
  }

  const idToken = String(json.idToken || '');
  try {
    const identity = await verifyIdToken(idToken);
    // Hạn mức theo IP: đổi phiên là thao tác nhẹ nhưng vẫn là điểm vào để bị
    // dội token hỏng. Đếm cả lần thành công để một script không spam vô hạn.
    const rate = await hit('session', clientIp(request), rules.session);
    if (!rate.ok) {
      return NextResponse.json(
        { error: `Qua nhieu lan thu. Thu lai sau ${rate.retryAfter} giay.` },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      );
    }

    const result = await syncFirebaseIdentity(identity, json.name ? String(json.name) : undefined);
    if (!result.ok) return NextResponse.json({ error: result.error, field: result.field }, { status: 400 });

    return NextResponse.json(
      { account: { id: result.pilot.id, code: result.pilot.code, name: result.pilot.name, username: result.pilot.username, email: result.pilot.email, createdAt: result.pilot.createdAt }, created: result.created },
      { status: result.created ? 201 : 200, headers: { 'Set-Cookie': sessionCookieHeader(request, result.token) } },
    );
  } catch (error) {
    return failure(error, 'Dang nhap that bai do loi may chu.');
  }
}