import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/**
 * Hash mat khau bang scrypt (co san trong Node, khong can them dependency native).
 * Moi lan dang ky sinh salt rieng, nen 2 nguoi cung mat khau van ra hash khac nhau.
 *
 * CHI dung ham async. `scrypt` mac dinh ton mot luong CPU ~100ms; ban `sync` se
 * chan toan bo event loop cua process, nen mot lo danh nhap sai mat khau gui
 * song song la du de lam treo server cho moi nguoi khac.
 */

const KEYLEN = 64;
const MAX_PASSWORD = 72; // scrypt khong doc qua 72 ky tu

export type PasswordRecord = { salt: string; hash: string };

/** `scrypt` bao loi neu tham so sai — bo qua loi, tra null de caller xu ly. */
const scryptAsync = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
  });

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt)).toString('hex');
  return { salt, hash };
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  if (!salt || !hash) return false;
  if (typeof password !== 'string' || password.length > MAX_PASSWORD) return false;
  const expected = Buffer.from(hash, 'hex');
  if (expected.length !== KEYLEN) return false;
  let actual: Buffer;
  try {
    actual = await scryptAsync(password, salt);
  } catch {
    return false;
  }
  // timingSafeEqual chan tan cong do thoi gian: so sanh trong thoi gian khong doi
  // du mat khau dung o ky tu thu may.
  return timingSafeEqual(actual, expected);
}

/**
 * Tra ve chuoi loi, hoac `null` neu hop le.
 * Day la nguon su that duy nhat cho luật mat khau — `registerAccount` va
 * `changePassword` deu goi ham nay nen khong the xay ra tinh trang hai noi
 * cho phep cac gioi han khac nhau.
 */
export function checkPassword(password: string): string | null {
  if (typeof password !== 'string' || password.length < 6) return 'Mat khau can toi thieu 6 ky tu.';
  if (password.length > MAX_PASSWORD) return `Mat khau toi da ${MAX_PASSWORD} ky tu.`;
  return null;
}

const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

export function checkUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (username.length < 3) return 'Ten dang nhap can toi thieu 3 ky tu.';
  if (username.length > 20) return 'Ten dang nhap toi da 20 ky tu.';
  if (!USERNAME_RE.test(username)) return 'Ten dang nhap chi gom chu thuong, so, dau . _ -';
  if (/^[._-]|[._-]$/.test(username)) return 'Ten dang nhap khong duoc bat dau hoac ket thuc bang dau . _ -';
  return null;
}

