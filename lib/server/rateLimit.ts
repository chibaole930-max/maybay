/**
 * Gioi han tan suat request theo IP, dung cho API dang nhap / chat.
 *
 * Luu trong KV nen chung cho moi instance cua serverless (khac voi mot bien
 * trong bo nho, chi giu duoc tren may hien tai).
 *
 * Cach xoa: moi khoang lau se quet het khoa het han. Do lon nho (vai chuc khoa
 * tren moi dia chi IP) nen quet toan bo cung re — khong can thu muc tinh rieng.
 */

import { kvGetJsonEx, kvSetJsonEx } from './kv';

const PREFIX = 'vat:rl';
/** Sổ khoá tự quyên sau 10 phút — đủ để quét dọn khoá đã hết hạn. */
const SWEEP_WINDOW_SECONDS = 10 * 60;

export interface RateResult {
  ok: boolean;
  /** So lan con lai trong cua so hien tai. */
  remaining: number;
  /** Giay cho den khi cua so mo lai — client nen bao cho nguoi dung. */
  retryAfter: number;
}

export type Rule = { limit: number; windowSeconds: number };

/** Bao lâu một lần thì quét dọn khoá cũ (giây). */
const SWEEP_EVERY = 60;

let sinceSweep = 0;

/**
 * IP lay tu `x-forwarded-for` / `x-real-ip` (hosting luon dat san) — ho tro khi
 * chay truc tiep thi dung dia chi cua chinh no, du cho rat it nguoi.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'local';
}

const keyOf = (name: string, id: string) => `${PREFIX}:${name}:${id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}`;

type Bucket = { count: number; expiresAt: number };

/** Sổ khoá đã dùng, để quét dọn. Xem `remember`. */
type Registry = { keys: string[] };

/** Ghi nhận một lần gọi. Trả `ok: false` khi vượt hạn mức. */
export async function hit(name: string, id: string, rule: Rule): Promise<RateResult> {
  const key = keyOf(name, id);
  // `kvGetJsonEx` chứ không `kvGetJson`: ở chế độ file, `kvSetJsonEx` bọc giá trị
  // trong `{ value, expiresAt }`. Đọc bằng `kvGetJson` sẽ nhận vỏ ngoài, `count`
  // thành `undefined` và mọi lần gọi sau đó đều bị coi là vượt hạn mức.
  const bucket = await kvGetJsonEx<Bucket | null>(key, null);

  if (bucket && bucket.expiresAt > Date.now()) {
    bucket.count += 1;
    await kvSetJsonEx(key, bucket, rule.windowSeconds);
    const retryAfter = Math.ceil((bucket.expiresAt - Date.now()) / 1000);
    return { ok: bucket.count <= rule.limit, remaining: Math.max(0, rule.limit - bucket.count), retryAfter };
  }

  // Cua so moi.
  const fresh: Bucket = { count: 1, expiresAt: Date.now() + rule.windowSeconds * 1000 };
  await kvSetJsonEx(key, fresh, rule.windowSeconds);
  await remember(key);
  return { ok: true, remaining: rule.limit - 1, retryAfter: rule.windowSeconds };
}

/**
 * Ghi khoa vừa dùng vào sổ để quét sau, và thỉnh thoảng dọn khoa đã hết hạn.
 *
 * Redis tự xoá khoá theo TTL, nhưng chế độ file thì không — nếu không quét,
 * mỗi IP đã từng gọi đều để lại một file vĩnh viễn trong `data/kv/`.
 */
async function remember(key: string): Promise<void> {
  if (Date.now() - sinceSweep < SWEEP_EVERY * 1000) return;
  sinceSweep = Date.now();

  const registry = await kvGetJsonEx<Registry>(`${PREFIX}:registry`, { keys: [] });
  const next = registry.keys.includes(key) ? registry.keys : [...registry.keys, key].slice(-500);
  await kvSetJsonEx(`${PREFIX}:registry`, { keys: next }, SWEEP_WINDOW_SECONDS);

  // Quét toàn bộ sổ: vài chục khoá nên đọc hết vẫn rẻ, không cần thư mục chỉ mục riêng.
  // `kvGetJsonEx` tự xoá khoá đã hết hạn, nên chỉ cần đọc là xong.
  await Promise.all(next.map((k) => kvGetJsonEx<Bucket | null>(k, null)));
}

export const rules: Record<string, Rule> = {
  /** Do mat khau ton tai, nen giu chat — dem ca lan thanh cong. */
  login: { limit: 20, windowSeconds: 300 },
  // Dang ky chi ngan tao rac tai khoan, khong chan duoc brute force mat khau, nen
  // han rong — nhieu nguoi trong cung ca quan (trường, van phong) dùng chung IP.
  register: { limit: 20, windowSeconds: 3600 },
  changePassword: { limit: 10, windowSeconds: 3600 },
  /** Ghi tin: chat, len tin rao, them san bay. */
  write: { limit: 20, windowSeconds: 60 },
  /** Cap nhat chi so BXH — client poll nhieu nen han rong hon. */
  stats: { limit: 120, windowSeconds: 60 },
};