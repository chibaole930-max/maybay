import { randomUUID } from 'node:crypto';
import { kvGetJson, kvGetJsonWithTtl, kvMutateJson, kvSetJsonEx } from './kv';
import type { Pilot } from './onlineStore';

/**
 * Hop thu va thong bao cua nguoi choi.
 *
 * Thuoc tinh thuoc ve **nguoi nhan**, khong ve nguoi gui: mot tin "ban da ban
 * may bay" chi can ghi mot lan vao hop thu cua nguoi mua, khong phai copy cho
 * tat ca. Nho vay khong can bang gui nao — chi ghi dung vao ho so cua nguoi nhan.
 *
 * Thong bao sinh ra tu su kien that (da ban duoc may bay, duoc hoan tien khi bi
 * vuot gia, thang phien dau gia) chu khong phai khi client keu.
 */

export type NoticeKind = 'market' | 'auction' | 'social' | 'system';

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  at: number;
  read: boolean;
}

interface Inbox {
  notices: Notice[];
}

/** Tong so thong bao con giu. */
const MAX_NOTICES = 30;
/** So tin CHUA DOC toi da giu — tin doc duoc bi day ra cho tin chua doc moi hon. */
const MAX_UNREAD = 8;
/** Nhac lai thong bao som nhat mot lan moi 6 gio. */
const REMINDER_WINDOW_MS = 6 * 3600_000;

const inboxKey = (pilotId: string) => `vat:inbox:${pilotId}`;
const lastReminderKey = (pilotId: string) => `vat:inbox:last:${pilotId}`;

export type NoticeInput = { kind: NoticeKind; title: string; body: string; toast?: boolean };

/**
 * Ghi mot thong bao vao hop thu cua mot tai khoan.
 *
 * Cat tin trong mot luot ghi nen hai thong bao sinh cung luc khong ghi de nhau
 * (neu doc roi ghi, tin thu hai se xoa mat tin thu nhat).
 */
export async function pushNotice(pilot: Pilot, notice: NoticeInput): Promise<void> {
  const entry: Notice = {
    id: randomUUID(), kind: notice.kind, title: notice.title,
    body: notice.body, at: Date.now(), read: false,
  };

  await kvMutateJson<Inbox, void>(inboxKey(pilot.id), { notices: [] }, (inbox) => {
    // Moi nua len dau de hop thu sap theo thu tu thoi gian giam dan.
    let notices = [entry, ...inbox.notices].slice(0, MAX_NOTICES);
    // Chan luu: chi giu toi da MAX_UNREAD tin chua doc, tin doc duoc bi day ra.
    let unread = 0;
    notices = notices.filter((n) => {
      if (n.read) return true;
      unread += 1;
      return unread <= MAX_UNREAD;
    });
    inbox.notices = notices;
    return { next: inbox, result: undefined };
  });
}

/** Ghi thông báo cho nhiều tài khoản — ví dụ khi một giao dịch động cho cả hai bên. */
export async function pushToMany(pilots: Pilot[], build: (pilot: Pilot) => NoticeInput | null): Promise<void> {
  for (const pilot of pilots) {
    const notice = build(pilot);
    if (notice) await pushNotice(pilot, notice);
  }
}

/**
 * Đọc hộp thư.
 *
 * Dùng `kvGetJson` chứ không `kvGetJsonWithTtl`: hộp thư được ghi bằng
 * `kvMutateJson` (không bọc `{ value, expiresAt }`) nên hàm đọc theo hạn sẽ
 * không nhận ra bản ghi và luôn trả về `fallback` — tức là hộp thư luôn rỗng.
 */
const readInbox = (pilotId: string): Promise<Inbox> => kvGetJson<Inbox>(inboxKey(pilotId), { notices: [] });

/** Số thông báo chưa đọc — dùng cho quầng chuông ở thanh điều hướng. */
export async function unreadCount(pilotId: string): Promise<number> {
  const inbox = await readInbox(pilotId);
  return inbox.notices.filter((n) => !n.read).length;
}

/**
 * Đọc hop thu và đánh dấu đã đọc.
 *
 * Ghi trong cùng một lượt với lúc đọc: nếu đánh dấu ở lệnh riêng thì thông báo
 * sinh ra giữa hai lệnh sẽ bị đánh dấu đọc oan, người chơi không bao giờ thấy.
 */
export async function readAll(pilotId: string): Promise<Notice[]> {
  return kvMutateJson<Inbox, Notice[]>(inboxKey(pilotId), { notices: [] }, (inbox) => {
    const marked = inbox.notices.map((n) => (n.read ? n : { ...n, read: true }));
    inbox.notices = marked;
    return { next: inbox, result: marked };
  });
}

/** Xoá thông báo đã đọc. Tin chưa đọc được giữ lại. */
export async function clearRead(pilotId: string): Promise<Notice[]> {
  return kvMutateJson<Inbox, Notice[]>(inboxKey(pilotId), { notices: [] }, (inbox) => {
    inbox.notices = inbox.notices.filter((n) => !n.read).slice(0, MAX_UNREAD);
    return { next: inbox, result: inbox.notices };
  });
}

/**
 * Thông báo cũ chưa đọc để nhắc lại khi người chơi quay lại game.
 *
 * Có khoảng nghỉ 6 giờ và tự hết hạn — nếu không, mỗi lần vào game đều thấy một
 * đống thông báo cũ đã lỡ qua, càng chán hơn là không có gì.
 */
export async function pendingReminders(pilotId: string): Promise<Notice[]> {
  const now = Date.now();
  const last = await kvGetJsonWithTtl<number>(lastReminderKey(pilotId), 0);
  if (now - last < REMINDER_WINDOW_MS) return [];

  const inbox = await readInbox(pilotId);
  const unread = inbox.notices.filter((n) => !n.read);
  if (unread.length === 0) return [];

  await kvSetJsonEx(lastReminderKey(pilotId), now, REMINDER_WINDOW_MS / 1000 + 60);
  return unread.slice(0, MAX_UNREAD);
}