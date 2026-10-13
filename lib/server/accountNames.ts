/**
 * Chuan hoa va kiem tra ten hien thi cua tai khoan game.
 *
 * Tach rieng khoi ma bam mat khau: mat khau nam trong Firebase, may chu game
 * khong con gi de bam. File nay chi con phien ban ten hien thi.
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
 * Chuan hoa email de so sanh dung: bo khoang trang thua va ha chu thuong phan
 * ten mien (Google co chay phan `@Gmail.com` va `Gmail.com` la mot tai khoan).
 *
 * KHONG dung cho xac thuc — Firebase so sanh email da chuan hoa san. Ham nay
 * chi dung de khop tai khoan game voi tai khoan Firebase.
 */
export const normalizeEmail = (raw: string): string => String(raw || '').trim().toLowerCase();