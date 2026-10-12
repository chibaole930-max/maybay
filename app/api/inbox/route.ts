import { NextResponse } from 'next/server';
import { clearRead, pendingReminders, readAll, unreadCount } from '@/lib/server/inbox';
import { accountFromRequest } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

/**
 * Hop thu.
 *
 * GET              -> danh sach thong bao + so chua doc; kem `reminders` la cac
 *                    tin cu chua xem de GameShell hien len khi vao game.
 * POST { action: 'read' }   -> danh dau da doc
 * POST { action: 'clear' }  -> xoa tin da doc, giu tin chua doc
 *
 * Xem `lib/server/inbox.ts`.
 */

export async function GET(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap de xem hop thu.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  // `?peek=1` chỉ đếm chưa đọc mà không đánh dấu đã đọc — dùng cho việc đồng bộ
  // nhẹ, tránh việc badge tự tắt chỉ vì client vô tình gọi nhầm.
  if (searchParams.get('peek') === '1') {
    return NextResponse.json({ unread: await unreadCount(session.pilot.id) });
  }

  // Thứ tự quan trọng: đếm và lấy reminders TRƯỚC `readAll`. Cả ba đều chạm vào
  // cùng hộp thư; chạy song song thì `readAll` có thể đánh dấu đã đọc trước, khiến
  // `unread` luôn bằng 0 và `reminders` không bao giờ có gì để nhắc.
const unread = await unreadCount(session.pilot.id);
  const reminders = await pendingReminders(session.pilot.id);
  const notices = await readAll(session.pilot.id);
  return NextResponse.json({ notices, unread, reminders });
}

export async function POST(request: Request) {
  const session = await accountFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Can dang nhap.' }, { status: 401 });

  let json: { action?: unknown };
  try {
    json = (await request.json()) as { action?: unknown };
  } catch {
    return NextResponse.json({ error: 'Du lieu khong hop le.' }, { status: 400 });
  }

  if (json.action === 'clear') {
    const kept = await clearRead(session.pilot.id);
    return NextResponse.json({ notices: kept, unread: kept.length });
  }
  if (json.action !== 'read') return NextResponse.json({ error: 'Khong ro hanh dong.' }, { status: 400 });

  const notices = await readAll(session.pilot.id);
  return NextResponse.json({ notices, unread: 0 });
}