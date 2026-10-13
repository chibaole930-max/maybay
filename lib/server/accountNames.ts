/**
 * Chuan hoa va kiem tra ten hien thi cua tai khoan game.
 */

export const normalizeDisplayName = (raw: string): string =>
  String(raw || '').trim().replace(/\s+/g, ' ');

/** Ten hien thi (ten hang bay): chua chan khoang trang du thua. */
export function checkDisplayName(raw: string): string | null {
  const name = normalizeDisplayName(raw);
  if (name.length < 3) return 'Ten hang bay can toi thieu 3 ky tu.';
  if (name.length > 32) return 'Ten hang bay toi da 32 ky tu.';
  return null;
}

/**
 * Chuan hoa email de so sanh dung: bo khoang trang thua va ha chu thuong.
 * Giu lai cho tuong thich du lieu cu (tai khoan Firebase co email).
 */
export const normalizeEmail = (raw: string): string => String(raw || '').trim().toLowerCase();