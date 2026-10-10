import type { Pilot, PublicPilot } from './onlineStore';
import { destroySession, publicPilot, resolveSession } from './onlineStore';

/** Phien dang nhap bang cookie httpOnly — JS trong trang doc khong duoc, chan XSS lay trom. */
export const SESSION_COOKIE = 'vat_session';

const MAX_AGE = 30 * 86400;

export function readCookie(request: Request, name: string): string {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.trim().indexOf('=');
    if (eq === -1) continue;
    if (part.trim().slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(part.trim().slice(eq + 1));
    } catch {
      return part.trim().slice(eq + 1);
    }
  }
  return '';
}

/**
 * Có nên gắn cờ `Secure` (chỉ gửi cookie qua HTTPS) không.
 * Trình duyệt coi `localhost` / `127.0.0.1` là secure context sẵn rồi, nên bật
 * `Secure` ở đó sẽ làm cookie không bao giờ được gửi khi chạy local qua HTTP.
 */
function isSecureContext(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  try {
    const host = new URL(request.url).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]';
  } catch {
    return false;
  }
}

function cookieHeader(request: Request, value: string, maxAge: number): string {
  const parts = [`${SESSION_COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAge >= 0) parts.push(`Max-Age=${maxAge}`);
  if (isSecureContext(request)) parts.push('Secure');
  return parts.join('; ');
}

export function sessionCookieHeader(request: Request, token: string): string {
  return cookieHeader(request, encodeURIComponent(token), MAX_AGE);
}

export function clearCookieHeader(request: Request): string {
  return cookieHeader(request, '', 0);
}

/** Tai khoan tuong ung voi cookie phien trong request. `null` = chua dang nhap. */
export async function accountFromRequest(request: Request): Promise<{ pilot: Pilot; account: PublicPilot } | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const pilot = await resolveSession(token);
  if (!pilot) return null;
  return { pilot, account: publicPilot(pilot) };
}

export async function logoutRequest(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await destroySession(token);
}
